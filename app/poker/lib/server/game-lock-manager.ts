// app/lib/server/poker/game-lock-manager.ts

import { PokerGame } from '@/app/poker/lib/models/poker-game';
import { initializeBets } from '@/app/poker/lib/utils/betting-helpers';
import { withRetry } from '@/app/lib/utils/retry';
import { POKER_RETRY_CONFIG } from '@/app/poker/lib/config/poker-constants';
import { acquireGameLock, releaseGameLock } from './game-lock-utils';
import { logGameStartedAction } from '@/app/poker/lib/utils/action-history-helpers';

// Store timeout references for cancellation
const lockTimers = new Map<string, NodeJS.Timeout>();

/**
 * Execute the pre-game sequence with paced notifications
 * 1. Small blind posted → notification → delay
 * 2. Big blind posted → notification → delay
 * 3. Hole cards dealt → notification → delay
 *
 * Exported for use in both initial game lock and restart flows
 */
export async function executePreGameSequence(game: any, delayMs: number): Promise<void> {
  const { placeSmallBlind, placeBigBlind } = await import('./blinds-manager');
  const { dealPlayerCards } = await import('./poker-dealer');
  const { ActionHistoryType } = await import('@/app/poker/lib/definitions/action-history');
  const { randomBytes } = await import('crypto');
  const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');

  // STEP 1: Place small blind (no border - blinds are automatic)
  const smallBlindInfo = placeSmallBlind(game);
  console.log(`[PreGame] Small blind posted by ${smallBlindInfo.player.username}: ${smallBlindInfo.amount} chips`);

  // Save state after small blind
  await game.save();

  // Emit small blind notification
  await PokerSocketEmitter.emitNotification({
    notificationType: 'blind_posted',
    category: 'blind',
    playerId: smallBlindInfo.player.id,
    playerName: smallBlindInfo.player.username,
    chipAmount: smallBlindInfo.amount,
    blindType: 'small',
    // Include pot sync data
    pot: JSON.parse(JSON.stringify(game.pot)),
    playerBets: [...game.playerBets],
    currentPlayerIndex: game.currentPlayerIndex,
  });

  // Wait for notification to display
  await new Promise(resolve => setTimeout(resolve, delayMs));

  // STEP 2: Place big blind (no border - blinds are automatic)
  const bigBlindInfo = placeBigBlind(game);
  console.log(`[PreGame] Big blind posted by ${bigBlindInfo.player.username}: ${bigBlindInfo.amount} chips`);

  // Save state after big blind
  await game.save();

  // Emit big blind notification
  await PokerSocketEmitter.emitNotification({
    notificationType: 'blind_posted',
    category: 'blind',
    playerId: bigBlindInfo.player.id,
    playerName: bigBlindInfo.player.username,
    chipAmount: bigBlindInfo.amount,
    blindType: 'big',
    // Include pot sync data
    pot: JSON.parse(JSON.stringify(game.pot)),
    playerBets: [...game.playerBets],
    currentPlayerIndex: game.currentPlayerIndex,
  });

  // Wait for notification to display
  await new Promise(resolve => setTimeout(resolve, delayMs));

  // STEP 3: Deal hole cards
  dealPlayerCards(game.deck, game.players, 2);
  game.markModified('deck');
  game.markModified('players');

  // Add action history for dealing hole cards
  game.actionHistory.push({
    id: randomBytes(8).toString('hex'),
    timestamp: new Date(),
    stage: 0, // Preflop
    actionType: ActionHistoryType.CARDS_DEALT,
    cardsDealt: 2,
  });
  game.markModified('actionHistory');

  // Save state after dealing cards
  await game.save();

  // Emit cards dealt notification
  await PokerSocketEmitter.emitNotification({
    notificationType: 'cards_dealt',
    category: 'deal',
  });

  // Emit cards dealt event immediately so cards appear at start of notification
  await PokerSocketEmitter.emitCardsDealt({
    stage: game.stage,
    communalCards: game.communalCards,
    players: game.players.map(p => ({
      ...p.toObject(),
      hand: p.hand, // Include hole cards in player data
    })),
    deck: game.deck,
    currentPlayerIndex: game.currentPlayerIndex,
  });

  // Wait for notification to display
  await new Promise(resolve => setTimeout(resolve, delayMs));

  console.log('[PreGame] Pre-game sequence complete');
}

/**
 * Initialize game when it's locked (2+ players ready to play)
 * Uses distributed locking to prevent race conditions with manual "Start Now" clicks
 */
async function initializeGameAtLock(gameId: string): Promise<void> {
  try {
    await withRetry(async () => {
      // ATOMIC LOCK ACQUISITION
      const gameToLock = await acquireGameLock(gameId);

      try {
        // Check if game is already locked - if so, operation already succeeded (idempotent)
        if (gameToLock.locked) {
          gameToLock.processing = false;
          await gameToLock.save();
          return;
        }

        // CRITICAL: Check if we have enough players before locking
        // A player may have left during the countdown timer, so we need to verify
        if (gameToLock.players.length < 2) {
          console.log(`[Auto Lock] ABORTED - insufficient players (${gameToLock.players.length}). Releasing lock.`);
          gameToLock.processing = false;
          gameToLock.lockTime = undefined; // Clear lock time since we're not locking
          await gameToLock.save();

          // Emit state update to sync clients with the aborted lock attempt
          const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
          await PokerSocketEmitter.emitStateUpdate(gameToLock);

          return;
        }

        gameToLock.locked = true;
        gameToLock.lockTime = undefined; // Clear lock time since we're locking now
        gameToLock.stage = 0; // Preflop
        gameToLock.playerBets = initializeBets(gameToLock.players.length);

        // Set currentPlayerIndex to small blind position (border will show during entire locked phase)
        const buttonPosition = gameToLock.dealerButtonPosition || 0;
        const isHeadsUp = gameToLock.players.length === 2;
        gameToLock.currentPlayerIndex = isHeadsUp ? buttonPosition : (buttonPosition + 1) % gameToLock.players.length;

        // Initialize dealer button position if not set (first hand starts at position 0)
        if (gameToLock.dealerButtonPosition === undefined) {
          gameToLock.dealerButtonPosition = 0;
          gameToLock.markModified('dealerButtonPosition');
        }

        // Add action history for game start
        logGameStartedAction(gameToLock);

        // Players start with empty hands - cards will be dealt after first blind betting round

        // Release lock before save
        gameToLock.processing = false;
        await gameToLock.save();

        // Migrate players from old chips array format if needed
        const { getChipTotal } = await import('@/app/poker/lib/utils/poker');
        let migrationNeeded = false;
        for (const player of gameToLock.players) {
          if ((player as any).chips && Array.isArray((player as any).chips)) {
            const oldChipTotal = getChipTotal((player as any).chips);
            player.chipCount = oldChipTotal;
            delete (player as any).chips;
            migrationNeeded = true;
            console.log(`[GameLockManager] Migrated player ${player.username} chips: ${oldChipTotal}`);
          } else if (typeof player.chipCount !== 'number') {
            // No chipCount set, default to starting chips
            const { POKER_GAME_CONFIG } = await import('@/app/poker/lib/config/poker-constants');
            player.chipCount = POKER_GAME_CONFIG.DEFAULT_STARTING_CHIPS;
            migrationNeeded = true;
            console.log(`[GameLockManager] Set default chips for player ${player.username}: ${player.chipCount}`);
          }
        }
        if (migrationNeeded) {
          gameToLock.markModified('players');
          await gameToLock.save();
        }

        // Validate players have enough chips before placing blinds
        const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
        const { getBlindConfig } = await import('./blinds-manager');
        const { smallBlind, bigBlind } = getBlindConfig();

        // Calculate which players will post blinds based on button position (already declared above)
        const smallBlindPos = isHeadsUp ? buttonPosition : (buttonPosition + 1) % gameToLock.players.length;
        const bigBlindPos = isHeadsUp ? (buttonPosition + 1) % gameToLock.players.length : (buttonPosition + 2) % gameToLock.players.length;

        const smallBlindPlayerChips = gameToLock.players[smallBlindPos]?.chipCount || 0;
        const bigBlindPlayerChips = gameToLock.players[bigBlindPos]?.chipCount || 0;

        // Players need at least SOME chips to post blinds (can go all-in with less than blind amount)
        if (smallBlindPlayerChips === 0 || bigBlindPlayerChips === 0) {
          // At least one player has no chips at all - can't start game
          console.error(`[Auto Lock] Player with zero chips - SB Player ${smallBlindPos}: ${smallBlindPlayerChips}, BB Player ${bigBlindPos}: ${bigBlindPlayerChips}`);

          // Unlock game and release lock
          gameToLock.locked = false;
          gameToLock.processing = false;
          await gameToLock.save();

          throw new Error(`Cannot start game - players have zero chips`);
        }

        // Log if players will go all-in on blinds
        if (smallBlindPlayerChips < smallBlind) {
          console.log(`[Auto Lock] Small blind player will go all-in: ${smallBlindPlayerChips}/${smallBlind} chips`);
        }
        if (bigBlindPlayerChips < bigBlind) {
          console.log(`[Auto Lock] Big blind player will go all-in: ${bigBlindPlayerChips}/${bigBlind} chips`);
        }

        // PACED PRE-GAME FLOW WITH NOTIFICATIONS
        // This creates a better UX by showing what's happening step-by-step
        const { POKER_TIMERS } = await import('@/app/poker/lib/config/poker-constants');
        await executePreGameSequence(gameToLock, POKER_TIMERS.PLAYER_ACTION_NOTIFICATION_DURATION_MS);

        console.log(`[Auto Lock] Hole cards dealt to all players`);

        // NOW set currentPlayerIndex after blinds are posted and cards are dealt
        // In heads-up: Small blind acts first preflop
        // In 3+ players: Player after big blind (UTG) acts first
        // Reuse buttonPosition from line 81 (already declared)
        const initialPosition = gameToLock.players.length === 2
          ? buttonPosition  // Heads-up: button (small blind) acts first
          : (bigBlindPos + 1) % gameToLock.players.length;  // 3+: player after big blind (UTG)

        // Find first active player starting from initialPosition
        // Skip any players who went all-in during blind posting
        let currentIndex = initialPosition;
        let attempts = 0;

        console.log(`[Auto Lock] Finding first active player starting from position ${initialPosition} (${gameToLock.players.length} players, heads-up: ${gameToLock.players.length === 2})`);

        while (attempts < gameToLock.players.length) {
          const candidate = gameToLock.players[currentIndex];
          console.log(`[Auto Lock] Checking player at index ${currentIndex}: ${candidate.username}, isAllIn: ${candidate.isAllIn}, folded: ${candidate.folded}`);
          if (!candidate.isAllIn && !candidate.folded) {
            console.log(`[Auto Lock] Found active player at index ${currentIndex}: ${candidate.username}`);
            break; // Found an active player
          }
          currentIndex = (currentIndex + 1) % gameToLock.players.length;
          attempts++;
        }

        gameToLock.currentPlayerIndex = currentIndex;
        gameToLock.markModified('currentPlayerIndex');
        console.log(`[Auto Lock] Set currentPlayerIndex to ${currentIndex} (${gameToLock.players[currentIndex]?.username}) AFTER cards dealt`);

        await gameToLock.save();

        // Emit game locked event to all clients with blinds and cards already dealt
        await PokerSocketEmitter.emitGameLocked({
          locked: true,
          stage: gameToLock.stage,
          players: gameToLock.players,
          currentPlayerIndex: gameToLock.currentPlayerIndex,
          lockTime: undefined, // Cleared
          pot: gameToLock.pot,
          playerBets: gameToLock.playerBets,
          actionHistory: gameToLock.actionHistory,
        });

        console.log(`[Auto Lock] Game locked - current player index: ${gameToLock.currentPlayerIndex}, player: ${gameToLock.players[gameToLock.currentPlayerIndex]?.username}, isAI: ${gameToLock.players[gameToLock.currentPlayerIndex]?.isAI}`);

        // Auto-start action timer for the current player (after blinds and cards dealt)
        // Timer starts for both human and AI players - AI will act quickly and cancel timer
        const currentPlayer = gameToLock.players[gameToLock.currentPlayerIndex];
        if (currentPlayer) {
          const { startActionTimer } = await import('./poker-timer-controller');
          const { POKER_TIMERS } = await import('@/app/poker/lib/config/poker-constants');
          const { GameActionType } = await import('@/app/poker/lib/definitions/game-actions');

          console.log(`[Auto Lock] Starting timer for current player: ${currentPlayer.username} (AI: ${currentPlayer.isAI})`);

          await startActionTimer(
            gameId,
            POKER_TIMERS.ACTION_DURATION_SECONDS,
            GameActionType.PLAYER_BET,
            currentPlayer.id
          );

          // If current player is AI, trigger action immediately after timer starts
          if (currentPlayer.isAI) {
            console.log('[Auto Lock] Timer started for AI player - triggering immediate action');
            const { executeAIActionIfReady } = await import('./ai-player-manager');
            // Wait a bit longer to ensure client has processed game_locked event
            await new Promise(resolve => setTimeout(resolve, 200));
            executeAIActionIfReady(gameId).catch(error => {
              console.error('[Auto Lock] AI action failed:', error);
            });
          }
        } else {
          console.error(`[Auto Lock] ERROR: No current player found at index ${gameToLock.currentPlayerIndex}`);
        }
      } catch (error) {
        // Release lock on error
        await releaseGameLock(gameId);
        throw error;
      }
    }, POKER_RETRY_CONFIG);
  } catch (error) {
    console.error('[Auto Lock] Error auto-locking game:', error);
  }
}

/**
 * Schedule auto-lock when second player joins
 * Game will lock after 10 seconds to allow more players to join
 */
export function scheduleGameLock(gameId: string, lockTime: Date): void {
  // Cancel any existing timer for this game
  cancelGameLock(gameId);

  const delay = lockTime.getTime() - Date.now();

  const timeoutId = setTimeout(async () => {
    lockTimers.delete(gameId); // Clean up reference after execution
    await initializeGameAtLock(gameId);
  }, delay);

  // Store timeout reference for cancellation
  lockTimers.set(gameId, timeoutId);
}

/**
 * Cancel a scheduled game lock
 * Called when a player leaves and player count drops below 2
 */
export function cancelGameLock(gameId: string): void {
  const timeoutId = lockTimers.get(gameId);
  if (timeoutId) {
    clearTimeout(timeoutId);
    lockTimers.delete(gameId);
  }
}

/**
 * Check if game should start lock timer (2 players joined)
 */
export function shouldStartLockTimer(playerCount: number, hasLockTime: boolean): boolean {
  return playerCount === 2 && !hasLockTime;
}
