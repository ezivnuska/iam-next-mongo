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

        // Calculate initial current player index (before blinds/cards)
        // This is just for UI display - step system will manage actual turn flow
        const initialPosition = gameToLock.players.length === 2
          ? buttonPosition  // Heads-up: button (small blind) acts first preflop
          : (bigBlindPos + 1) % gameToLock.players.length;  // 3+: player after big blind (UTG)

        gameToLock.currentPlayerIndex = initialPosition;
        gameToLock.markModified('currentPlayerIndex');

        await gameToLock.save();

        // Emit game locked event
        // NOTE: pot and playerBets are intentionally omitted here as they're empty at lock time.
        // Blinds will be posted via step flow and synced via blind notifications + state updates.
        await PokerSocketEmitter.emitGameLocked({
          locked: true,
          stage: gameToLock.stage,
          players: gameToLock.players,
          currentPlayerIndex: gameToLock.currentPlayerIndex,
          lockTime: undefined,
          actionHistory: gameToLock.actionHistory,
        });

        console.log(`[Auto Lock] Game locked - starting step-based flow`);

        // *** NEW STEP-BASED FLOW ***
        // Start the step orchestrator which will handle the entire game flow:
        // 1. Stage notification (Pre-Flop)
        // 2. Post small blind
        // 3. Post big blind
        // 4. Deal hole cards
        // 5. Betting cycle
        // ... and all subsequent stages
        const { startStepFlow } = await import('./step-orchestrator');
        await startStepFlow(gameId);
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
