// app/lib/server/poker-game-controller.ts

import { PokerGame, type PokerGameDocument } from '@/app/poker/lib/models/poker-game';
import { PokerBalance } from '@/app/poker/lib/models/poker-balance';
import { withRetry } from '@/app/lib/utils/retry';
import type { Bet, Card, Player } from '@/app/poker/lib/definitions/poker';
import { GameStage } from '@/app/poker/lib/definitions/poker';
import { GameActionType } from '@/app/poker/lib/definitions/game-actions';
import { ActionHistoryType } from '@/app/poker/lib/definitions/action-history';
import { randomBytes } from 'crypto';

// Import extracted modules
import { savePlayerBalances, awardPotToWinners } from './poker-game-flow';
import { dealPlayerCards, reshuffleAllCards, initializeDeck } from './poker-dealer';
import { startActionTimer, clearActionTimer, pauseActionTimer, resumeActionTimer } from './poker-timer-controller';
import { ensurePlayerBetsInitialized, processBetTransaction, updateGameAfterBet } from './bet-processor';
import { validatePlayerExists, getActivePlayerUsernames, findOtherPlayer } from '@/app/poker/lib/utils/player-helpers';
import { scheduleGameLock, shouldStartLockTimer } from './game-lock-manager';
import { getPlayerChipCount } from '@/app/poker/lib/utils/side-pot-calculator';
import { TurnManager } from './turn-manager';
import { PokerSocketEmitter } from '@/app/lib/utils/socket-helper';

// Import refactored utilities
import { POKER_GAME_CONFIG, POKER_TIMERS, POKER_RETRY_CONFIG } from '@/app/poker/lib/config/poker-constants';
import { acquireGameLock, releaseGameLock } from './game-lock-utils';
import {
  logBetAction,
  logFoldAction,
  logPlayerLeftAction,
  logGameRestartAction
} from '@/app/poker/lib/utils/action-history-helpers';
import { placeSmallBlind, placeBigBlind } from './blinds-manager';

export async function getGame(gameId: string) {
  return await PokerGame.findById(gameId);
}

export async function getUserCurrentGame(userId: string) {
  const game = await PokerGame.findOne({
    'players.id': userId
  });

  return game ? game.toObject() : null;
}

export async function createGame() {
  const deck = initializeDeck();
  const code = randomBytes(3).toString('hex').toUpperCase();

  const game = await PokerGame.create({
    code,
    deck,
    communalCards: [],
    pot: [],
    players: [],
    stage: Number(GameStage.Preflop), // Ensure it's stored as number 0 (Preflop stage)
    currentPlayerIndex: 0,
    playerBets: [],
  });

  return game.toObject();
}

export async function addPlayer(
  gameId: string,
  user: { id: string; username: string }
) {
  // Get or create balance ONCE before retry loop to avoid duplicate creation
  const balanceDoc = await PokerBalance.findOne({ userId: user.id }).lean();
  let playerChipCount: number = POKER_GAME_CONFIG.DEFAULT_STARTING_CHIPS;

  if (balanceDoc) {
    const balance = balanceDoc as any; // Use any for migration compatibility
    // Check if balance has the new chipCount field
    if (typeof balance.chipCount === 'number' && balance.chipCount > 0) {
      playerChipCount = balance.chipCount;
    } else if (balance.chips && Array.isArray(balance.chips)) {
      // Migrate from old chips array format
      const { getChipTotal } = await import('@/app/poker/lib/utils/poker');
      const oldChipTotal = getChipTotal(balance.chips);
      playerChipCount = oldChipTotal > 0 ? oldChipTotal : POKER_GAME_CONFIG.DEFAULT_STARTING_CHIPS;

      // Update the balance document to new format
      await PokerBalance.findOneAndUpdate(
        { userId: user.id },
        { $set: { chipCount: playerChipCount }, $unset: { chips: '' } }
      );
      console.log(`[AddPlayer] Migrated balance for ${user.username}: ${oldChipTotal} -> ${playerChipCount} chips`);
    } else {
      // Balance exists but has no chips, set to default
      await PokerBalance.findOneAndUpdate(
        { userId: user.id },
        { $set: { chipCount: playerChipCount } }
      );
      console.log(`[AddPlayer] Set default balance for ${user.username}: ${playerChipCount} chips`);
    }
  } else {
    // Create new balance record with starting chips
    await PokerBalance.create({ userId: user.id, chipCount: playerChipCount });
    console.log(`[AddPlayer] Created new balance for ${user.username}: ${playerChipCount} chips`);
  }

  // Reset balance to default if insufficient for big blind
  if (playerChipCount < POKER_GAME_CONFIG.BIG_BLIND) {
    console.log(`[AddPlayer] Player ${user.username} has insufficient balance (${playerChipCount} < ${POKER_GAME_CONFIG.BIG_BLIND}) - resetting to ${POKER_GAME_CONFIG.DEFAULT_STARTING_CHIPS}`);
    playerChipCount = POKER_GAME_CONFIG.DEFAULT_STARTING_CHIPS;

    // Update the balance in database
    await PokerBalance.findOneAndUpdate(
      { userId: user.id },
      { $set: { chipCount: playerChipCount } }
    );
  }

  // Retry logic for version conflicts
  return withRetry(async () => {
    const game = await PokerGame.findById(gameId);
    if (!game) throw new Error('Game not found');

    // Check if game is locked
    if (game.locked) {
      throw new Error('Game is locked - no new players allowed');
    }

    // Check if game is full (max players)
    if (game.players.length >= POKER_GAME_CONFIG.MAX_PLAYERS) {
      throw new Error(`Game is full - maximum ${POKER_GAME_CONFIG.MAX_PLAYERS} players allowed`);
    }

    // Check if player already in game (may have been added in a previous retry)
    const alreadyIn = game.players.some((p: Player) => p.id === user.id);
    if (alreadyIn) return game.toObject();

    game.players.push({
      id: user.id,
      username: user.username,
      hand: [],
      chipCount: playerChipCount,
    });

    // Explicitly mark players array as modified for Mongoose
    game.markModified('players');

    await game.save();

    // Start/reset auto-lock timer when we have 2+ total players and game not locked
    // Note: AI player is always present in singleton game, so this will trigger when first human joins
    if (game.players.length >= 2 && !game.locked) {
      const lockTime = new Date(Date.now() + POKER_GAME_CONFIG.AUTO_LOCK_DELAY_MS);
      game.lockTime = lockTime;
      await PokerGame.findByIdAndUpdate(gameId, { lockTime });
      scheduleGameLock(gameId, lockTime);
      const humanCount = game.players.filter((p: Player) => !p.isAI).length;
      console.log(`[AddPlayer] ${humanCount === 1 ? 'Started' : 'Reset'} auto-lock timer - game will lock in ${POKER_GAME_CONFIG.AUTO_LOCK_DELAY_MS / 1000} seconds (${game.players.length} total players: ${humanCount} human + AI)`);
    }

    // Return fresh game state
    const finalGame = await PokerGame.findById(gameId);
    return finalGame ? finalGame.toObject() : game.toObject();
  }, POKER_RETRY_CONFIG);
}

/**
 * Handle complete player join flow including emissions and notifications
 * Consolidates logic from /api/poker/join and /api/socket/emit routes
 */
export async function handlePlayerJoin(
  gameId: string,
  userId: string,
  username: string
): Promise<{ success: boolean; gameState: any; error?: string }> {
  try {
    // Add player to game
    const gameState = await addPlayer(gameId, {
      id: userId,
      username: username || 'Guest',
    });

    // Find the newly joined player
    const joinedPlayer = gameState.players.find((p: any) => p.id === userId);

    // Log player join action
    const { logPlayerJoined } = await import('@/app/poker/lib/utils/action-history');
    const currentStage = gameState.locked ? gameState.stage : -1;
    await logPlayerJoined(
      gameState._id.toString(),
      userId,
      username || 'Guest',
      currentStage
    );

    // Fetch updated game state with new action history
    const updatedGame = await PokerGame.findById(gameId);
    const { serializeGame } = await import('@/app/lib/utils/game-serialization');
    const serializedState = serializeGame(updatedGame);

    // Emit granular player joined event with actionHistory and lockTime
    await PokerSocketEmitter.emitPlayerJoined({
      player: joinedPlayer,
      players: gameState.players,
      playerCount: gameState.players.length,
      lockTime: gameState.lockTime ? new Date(gameState.lockTime).toISOString() : undefined,
      actionHistory: updatedGame?.actionHistory || [],
    });

    // If this player join brings the count to 2+ and game isn't locked, emit countdown notification
    if (gameState.players.length >= 2 && !gameState.locked && gameState.lockTime) {
      console.log('[HandlePlayerJoin] Emitting game_starting notification');
      await PokerSocketEmitter.emitNotification({
        notificationType: 'game_starting',
        category: 'info',
        countdownSeconds: POKER_GAME_CONFIG.AUTO_LOCK_DELAY_SECONDS,
      });
    }

    // Also emit full state to sync AI player changes and timer
    await PokerSocketEmitter.emitStateUpdate(gameState);

    return { success: true, gameState: serializedState };
  } catch (error: any) {
    const errorMessage = error?.message || 'Failed to join game';
    console.error('[HandlePlayerJoin] Error:', errorMessage);
    return { success: false, gameState: null, error: errorMessage };
  }
}

/**
 * Handle complete player leave flow including emissions and notifications
 * Consolidates logic from /api/poker/leave route
 */
export async function handlePlayerLeave(
  gameId: string,
  userId: string
): Promise<{ success: boolean; gameState: any; error?: string }> {
  try {
    // Get game state before removing to check timer
    const gameBefore = await PokerGame.findById(gameId);
    if (!gameBefore) {
      return { success: false, gameState: null, error: 'Game not found' };
    }

    const hadTimer = !!gameBefore.actionTimer;

    // Find player to get username for logging
    const player = gameBefore.players.find((p: Player) => p.id === userId);
    if (!player) {
      return { success: false, gameState: null, error: 'Player not found in game' };
    }

    // Remove player from game
    const gameState = await removePlayer(gameId, {
      id: userId,
      username: player.username,
    });

    // If timer was cleared due to insufficient players, notify clients
    if (hadTimer && !gameState.actionTimer && gameState.players.length < 2) {
      await PokerSocketEmitter.emitTimerCleared();
    }

    const { serializeGame } = await import('@/app/lib/utils/game-serialization');
    const serializedState = serializeGame(gameState);

    // Emit granular player left event with actionHistory
    await PokerSocketEmitter.emitPlayerLeft({
      playerId: userId,
      players: gameState.players,
      playerCount: gameState.players.length,
      gameReset: gameState.players.length === 0, // Game resets only if ALL players left
      actionHistory: gameState.actionHistory || [],
    });

    // If game was reset (< 2 players remain), send full state update to sync hands, cards, etc.
    if (gameState.players.length < 2) {
      await PokerSocketEmitter.emitStateUpdate(gameState);
    }

    return { success: true, gameState: serializedState };
  } catch (error: any) {
    const errorMessage = error?.message || 'Failed to leave game';
    console.error('[HandlePlayerLeave] Error:', errorMessage);
    return { success: false, gameState: null, error: errorMessage };
  }
}

export async function removePlayer(
  gameId: string,
  user: { id: string; username: string }
): Promise<any> {
  // Retry logic for version conflicts
  return withRetry(async () => {
    const game = await PokerGame.findById(gameId);
    if (!game) throw new Error('Game not found');

    const isPlayer = game.players.some((p: Player) => p.id === user.id);
    if (!isPlayer) return game.toObject();

    const leavingPlayer = game.players.find((p: Player) => p.id === user.id);
    const currentStage = game.stage;
    const wasCurrentPlayer = game.players[game.currentPlayerIndex]?.id === user.id;
    const leavingPlayerIndex = game.players.findIndex((p: Player) => p.id === user.id);

    game.players = game.players.filter((p: Player) => p.id !== user.id);

    // Save the updated player list first
    game.markModified('players');
    await game.save();

    // Manage lock timer based on total player count
    // Note: AI player is always present in singleton game
    if (game.players.length < 2) {
      // Cancel lock timer if player count drops below 2
      const { cancelGameLock } = await import('./game-lock-manager');
      cancelGameLock(gameId);
      game.lockTime = undefined;
      await PokerGame.findByIdAndUpdate(gameId, { lockTime: undefined });
      console.log('[RemovePlayer] Cancelled auto-lock timer - less than 2 players');

      // CRITICAL: Cancel any active "Game starting!" notification
      // This ensures spectators see the cancellation immediately
      await PokerSocketEmitter.emitNotificationCanceled();
      console.log('[RemovePlayer] Cancelled game starting notification - insufficient players');
    } else if (game.players.length >= 2 && !game.locked) {
      // Reset lock timer if 2+ players remain (give them more time after someone leaves)
      const { scheduleGameLock } = await import('./game-lock-manager');
      const lockTime = new Date(Date.now() + POKER_GAME_CONFIG.AUTO_LOCK_DELAY_MS);
      game.lockTime = lockTime;
      await PokerGame.findByIdAndUpdate(gameId, { lockTime });
      scheduleGameLock(gameId, lockTime);
      console.log(`[RemovePlayer] Reset auto-lock timer - game will lock in ${POKER_GAME_CONFIG.AUTO_LOCK_DELAY_MS / 1000} seconds`);
    }

    // If only AI player remains (no humans), reset game state (don't delete - singleton game persists)
    const humanCount = game.players.filter((p: Player) => !p.isAI).length;
    if (humanCount === 0) {
      console.log('[RemovePlayer] No human players remain - resetting singleton game');
      const { resetSingletonGame } = await import('./singleton-game');
      const resetGame = await resetSingletonGame(gameId);
      return resetGame.toObject();
    }

    // If the leaving player was the current player, advance turn to next player
    if (wasCurrentPlayer && game.players.length >= 2 && game.locked) {
      // Find next active player
      let nextIndex = leavingPlayerIndex % game.players.length;
      let attempts = 0;

      while (attempts < game.players.length) {
        const candidate = game.players[nextIndex];
        if (!candidate.isAllIn && !candidate.folded) {
          game.currentPlayerIndex = nextIndex;
          game.markModified('currentPlayerIndex');
          break;
        }
        nextIndex = (nextIndex + 1) % game.players.length;
        attempts++;
      }
    } else if (leavingPlayerIndex < game.currentPlayerIndex) {
      // If leaving player was before current player, adjust index
      game.currentPlayerIndex = game.currentPlayerIndex - 1;
      game.markModified('currentPlayerIndex');
    }

    // If only 1 player remains, reset game state completely
    if (game.players.length === 1) {
      game.locked = false;
      game.lockTime = undefined;
      game.winner = undefined;
      game.pot = [];
      game.stage = 0;
      game.currentPlayerIndex = 0;
      game.playerBets = [];
      game.communalCards = [];
      game.actionTimer = undefined;
      game.stages = [];

      // Clear remaining player's hand and reset deck
      const remainingPlayer = game.players[0];
      remainingPlayer.hand = [];
      game.deck = initializeDeck();

      // Mark modified for Mongoose (explicitly mark all reset fields)
      game.markModified('winner'); // Critical: Must mark winner as modified when setting to undefined
      game.markModified('locked');
      game.markModified('pot');
      game.markModified('stage');
      game.markModified('currentPlayerIndex');
      game.markModified('playerBets');
      game.markModified('communalCards');
      game.markModified('stages');
      game.markModified('players.0.hand');
      game.markModified('players');
      game.markModified('deck');

      // Clear any running server-side timers
      try {
        await clearActionTimer(gameId);
      } catch (timerError) {
        console.error('[RemovePlayer] Failed to clear timer:', timerError);
        // Don't fail player removal if timer clear fails
      }
    }

    // Add action history
    if (leavingPlayer) {
      logPlayerLeftAction(game, user.id, leavingPlayer.username);
    }

    await game.save();

    // Return fresh game state
    const finalGame = await PokerGame.findById(gameId);
    return finalGame ? finalGame.toObject() : game.toObject();
  }, POKER_RETRY_CONFIG);
}

/**
 * Calculate the starting player index for the current betting round
 * This is used to determine when all players have acted
 */
function getBettingRoundStartIndex(game: PokerGameDocument): number {
  const buttonPosition = game.dealerButtonPosition || 0;
  const playerCount = game.players.length;
  const isHeadsUp = playerCount === 2;
  const isPreflop = game.stage === 0; // Preflop is stage 0

  if (isPreflop) {
    // Preflop: First to act is after big blind
    if (isHeadsUp) {
      // Heads-up preflop: Button (small blind) acts first
      return buttonPosition;
    } else {
      // 3+ players preflop: Player after big blind acts first
      // Big blind is at buttonPosition + 2, so first to act is buttonPosition + 3
      return (buttonPosition + 3) % playerCount;
    }
  } else {
    // Postflop: Small blind (first player after button) acts first
    return (buttonPosition + 1) % playerCount;
  }
}

export async function placeBet(gameId: string, playerId: string, chipCount = 1) {
  // Retry with fresh state fetch on each attempt to avoid double-betting
  // Use more retries for high-contention scenarios (concurrent bets, round completion)
  return withRetry(async () => {
    // ATOMIC LOCK ACQUISITION
    const game = await acquireGameLock(gameId);

    try {
      // Validate player and get index
      const playerIndex = validatePlayerExists(game.players, playerId);

      // CRITICAL FIX: Check if this bet was already processed in a previous retry attempt
      // This prevents double-betting when MongoDB version conflicts trigger retries
      const currentPlayerBetAmount = game.playerBets[playerIndex] || 0;

      // Get player info before conditional (needed for logging later)
      const player = game.players[playerIndex];

      // Prevent betting during Showdown or GAME_ENDED stages
      if (game.stage >= 4) { // 4 = Showdown, 5 = End
        throw new Error('Cannot bet - game has ended');
      }

      // VALIDATION GATE: Use TurnManager to validate player can act
      const turnValidation = TurnManager.validatePlayerCanAct(game, playerId);
      if (!turnValidation.valid) {
        console.error('[PlaceBet] Turn validation failed:', turnValidation.errors);
        // For Phase 1, log but don't block - existing validations below will catch issues
        // In Phase 2, we would throw: throw new Error(`Cannot act: ${turnValidation.errors.join(', ')}`);
      }

      // Get current turn context for logging
      const turnContext = TurnManager.getCurrentTurnContext(game);
      if (turnContext) {
        console.log('[PlaceBet] Turn context:', {
          turnNumber: turnContext.turnNumber,
          stage: turnContext.stage,
          actionRequired: turnContext.actionRequired,
        });
      }

      // Validate it's this player's turn
      if (game.currentPlayerIndex !== playerIndex) {
        throw new Error('Not your turn');
      }

      // Validate player is not folded or all-in
      if (player.folded) {
        throw new Error('Cannot bet - you have folded');
      }
      if (player.isAllIn) {
        throw new Error('Cannot bet - you are all-in');
      }

      // Calculate current bet to call
      const { calculateCurrentBet } = await import('@/app/poker/lib/utils/betting-helpers');
      const betToCall = calculateCurrentBet(game.playerBets, playerIndex, game.players);

      // Validate bet amount
      const playerChipCount = getPlayerChipCount(player);

      // If checking (chipCount = 0), validate there's no bet to call
      if (chipCount === 0 && betToCall > 0) {
        throw new Error(`Cannot check - must call ${betToCall} chips or fold`);
      }

      // If calling/raising, validate player has enough chips (or is going all-in)
      if (chipCount > 0 && chipCount < betToCall && chipCount < playerChipCount) {
        throw new Error(`Must call at least ${betToCall} chips or go all-in`);
      }

      // Check if this exact bet was already processed in THIS betting round
      // We only check playerBets array (which is per-round), NOT the pot (which accumulates across rounds)
      const expectedNewBetAmount = currentPlayerBetAmount + chipCount;

      // If player's bet amount already includes this chipCount, skip processing
      // For check actions (chipCount = 0), verify it's still this player's turn
      // If the turn has advanced, the check was already processed
      let betAlreadyProcessed = false;
      if (chipCount > 0) {
        betAlreadyProcessed = currentPlayerBetAmount >= expectedNewBetAmount;
      } else {
        // For checks, only process if it's still this player's turn
        betAlreadyProcessed = game.currentPlayerIndex !== playerIndex;
      }

      if (!betAlreadyProcessed) {
        // Ensure player bets are initialized
        ensurePlayerBetsInitialized(game);

        // Process the bet transaction (handles all-in automatically)
        const { player: updatedPlayer, chipsToAdd, actualChipCount, wentAllIn } = processBetTransaction(player, chipCount);

        // Update game state with actual chip count
        updateGameAfterBet(game, playerIndex, chipCount, updatedPlayer, chipsToAdd, actualChipCount);

        // Log all-in action if player went all-in
        if (wentAllIn) {
          console.log(`[PlaceBet] Player ${player.username} went ALL-IN with ${actualChipCount} chips`);
        }
      }

      // Add action history OUTSIDE the betAlreadyProcessed check to ensure logging on retries
      // Check if this exact bet was already logged to prevent duplicates
      // NOTE: Use timestamp-based deduplication (within last 1 second) to handle retry scenarios
      const now = new Date();
      const oneSecondAgo = new Date(now.getTime() - 1000);

      // Determine if this is a blind post (happens during game lock, not during regular play)
      const isBlindPost = false; // Regular play bets are never blind posts

      const recentBetActions = game.actionHistory.filter((action: any) =>
        action.actionType === ActionHistoryType.PLAYER_BET &&
        action.playerId === playerId &&
        action.stage === game.stage &&
        action.chipAmount === chipCount &&
        action.isBlind === isBlindPost && // Also check if blind status matches
        action.timestamp && new Date(action.timestamp) > oneSecondAgo // Only check very recent duplicates
      );

      console.log(`[PlaceBet] Checking for duplicate bet actions for ${player.username} (AI: ${player.isAI}):`, {
        playerId,
        stage: game.stage,
        chipCount,
        isBlindPost,
        recentActionsCount: recentBetActions.length,
        totalActionsInHistory: game.actionHistory.length,
        checkingWithinLastSecond: true,
      });

      // Only log if this bet hasn't been logged in the last second (prevents retry duplicates)
      if (recentBetActions.length === 0) {
        console.log(`[PlaceBet] Logging bet action and emitting notification for ${player.username} (AI: ${player.isAI}), chipCount: ${chipCount}`);
        logBetAction(game, playerId, player.username, chipCount);

        console.log(`[PlaceBet] Current action history count: ${game.actionHistory.length}, last action:`, game.actionHistory[game.actionHistory.length - 1]);

        // Emit action notification (event-based)
        const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
        const { calculateCurrentBet } = await import('@/app/poker/lib/utils/betting-helpers');

        // Calculate what the bet to call was BEFORE this action
        const betToCall = calculateCurrentBet(
          game.playerBets.map((bet: number, idx: number) => idx === playerIndex ? currentPlayerBetAmount : bet),
          playerIndex,
          game.players
        );

        // Determine action type and notification type
        // Check if player went all-in based on current chip count
        const playerWentAllIn = game.players[playerIndex].chipCount === 0 && chipCount > 0;

        let notificationType: 'player_check' | 'player_call' | 'player_raise' | 'player_bet' | 'player_all_in';
        if (playerWentAllIn) {
          notificationType = 'player_all_in';
        } else if (chipCount === 0) {
          notificationType = 'player_check';
        } else if (betToCall > 0 && chipCount === betToCall) {
          notificationType = 'player_call';
        } else if (betToCall > 0 && chipCount > betToCall) {
          notificationType = 'player_raise';
        } else {
          notificationType = 'player_bet';
        }

        console.log(`[PlaceBet] *** EMITTING NOTIFICATION: ${notificationType} for ${player.username}, chips: ${chipCount}, stage: ${game.stage} ***`);

        // Send to all users (including acting user)
        // Acting user will skip showing duplicate notification but still signal ready
        await PokerSocketEmitter.emitNotification({
          notificationType,
          category: 'action',
          playerId,
          playerName: player.username,
          chipAmount: chipCount,
          isAI: player.isAI || false,  // Include AI flag so client knows not to signal ready
          // Include pot sync data
          pot: JSON.parse(JSON.stringify(game.pot)),
          playerBets: [...game.playerBets],
          currentPlayerIndex: game.currentPlayerIndex,
        });

        console.log(`[PlaceBet] *** NOTIFICATION EMITTED SUCCESSFULLY ***`);
      } else {
        console.warn(`[PlaceBet] SKIPPING notification emit for ${player.username} (AI: ${player.isAI}) - bet already logged (duplicate detected within last 1 second)`);
      }

      // DEFERRED TURN/STAGE ADVANCEMENT:
      // After emitting the notification, we do NOT advance the turn or stage here.
      // Instead, we wait for the client to signal 'poker:ready_for_next_turn' after viewing the notification.
      // The turn-handler will then check for round completion and advance accordingly.
      console.log('[PlaceBet] Action processed and notification emitted - deferring turn/stage advancement until client signals ready');

      // Clear timer since player has taken their action - do this BEFORE saving
      // This ensures the state update includes the cleared timer
      game.actionTimer = undefined;
      game.markModified('actionTimer');
      console.log('[PlaceBet] Timer cleared from game object');

      // Cancel the server-side setTimeout if it exists
      const { activeTimers } = await import('./poker-timer-controller');
      const existingTimer = activeTimers.get(gameId);
      if (existingTimer) {
        clearTimeout(existingTimer);
        activeTimers.delete(gameId);
        console.log('[PlaceBet] Canceled server-side timer');
      }

      // Release lock and save game state with current player index unchanged and timer cleared
      game.processing = false;
      await game.save();

      // Emit state update so clients see the updated bets, pot, and CLEARED TIMER
      const { PokerSocketEmitter: Emitter } = await import('@/app/lib/utils/socket-helper');
      await Emitter.emitStateUpdate(game.toObject());

      // If this was an AI action, wait for notification to complete before advancing
      // Human players will signal ready from the client after viewing the notification
      if (player.isAI) {
        console.log('[PlaceBet] AI action - waiting for notification to complete before advancing turn');

        const { POKER_TIMERS } = await import('../config/poker-constants');
        // Use setTimeout wrapped in Promise to properly await the delay
        await new Promise(resolve => setTimeout(resolve, POKER_TIMERS.NOTIFICATION_DURATION_MS));

        console.log('[PlaceBet] AI action notification complete - advancing turn');
        const { handleReadyForNextTurn } = await import('./turn-handler');
        await handleReadyForNextTurn(gameId);
        console.log('[PlaceBet] AI turn advancement completed');
      }

      // Return result in expected format
      return {
        game: game.toObject(),
        events: {
          betPlaced: {
            playerIndex,
            chipCount,
            pot: game.pot,
            playerBets: game.playerBets,
            currentPlayerIndex: game.currentPlayerIndex,
            actionHistory: game.actionHistory,
            players: game.players,
          }
        }
      };

      // OLD CODE BELOW - Keep for reference but commented out
      /*
      // Check if betting round is complete BEFORE saving
      // Round completion check logic:
      // We check for round completion when:
      // 1. Action has wrapped back to starting position, OR
      // 2. All players are all-in/folded (no one can act), OR
      // 3. Only one player can act AND all bets are equal (that player just matched)
      let roundInfo = { roundComplete: false, cardsDealt: false, gameComplete: false };

      // Check how many players can still act (not folded, not all-in)
      const { getPlayersWhoCanAct, getActivePlayers } = await import('@/app/poker/lib/utils/player-helpers');
      const playersWhoCanAct = getPlayersWhoCanAct(game.players);
      const activePlayers = getActivePlayers(game.players);

      // Check if all active players have equal bets THIS ROUND (playerBets, not pot)
      const activePlayerBets = activePlayers.map((p: Player) => {
        const idx = game.players.findIndex((player: Player) => player.id === p.id);
        return game.playerBets[idx] || 0;
      });

      // All active players should have equal bets for this round
      const allBetsEqual = activePlayerBets.length > 0 &&
        activePlayerBets.every((bet: number) => bet === activePlayerBets[0]);

      // Determine if we should check for round completion
      const startIndex = getBettingRoundStartIndex(game);

      // Count how many non-blind actions have happened in this stage
      const actionsInCurrentStage = game.actionHistory.filter((action: any) =>
        action.stage === game.stage &&
        !action.isBlind // Exclude blind posts
      ).length;

      // Get unique players who have acted (not including blinds)
      const playersWhoActedThisStage = new Set(
        game.actionHistory
          .filter((action: any) => action.stage === game.stage && !action.isBlind)
          .map((action: any) => action.playerId)
      );

      // Count active players who can act (current player is already included in playersWhoCanAct)
      const activePlayersCount = playersWhoCanAct.length;

      // We've wrapped if:
      // 1. Current player is at start position
      // 2. All active players have acted at least once
      // 3. At least 2 actions have occurred (can't wrap on first action)
      const allActivePlayersHaveActed = playersWhoActedThisStage.size >= activePlayersCount;
      const hasWrappedToStart = game.currentPlayerIndex === startIndex &&
                                 actionsInCurrentStage >= 2 &&
                                 allActivePlayersHaveActed;

      const noOneCanAct = playersWhoCanAct.length === 0;
      // If only one player can act and all bets are equal, that player just matched and round is complete
      const onlyOneCanActAndBetsEqual = playersWhoCanAct.length === 1 && allBetsEqual;

      const shouldCheckRoundCompletion = hasWrappedToStart || noOneCanAct || onlyOneCanActAndBetsEqual;

      // Log for debugging
      console.log('[PlaceBet] Round completion check:', {
        playerBets: game.playerBets,
        activePlayers: activePlayers.map((p: Player) => p.username),
        activePlayerBets,
        allBetsEqual,
        playersWhoCanAct: playersWhoCanAct.length,
        currentPlayerIndex: game.currentPlayerIndex,
        startIndex,
        actionsInCurrentStage,
        playersWhoActedThisStage: Array.from(playersWhoActedThisStage),
        activePlayersCount,
        allActivePlayersHaveActed,
        hasWrappedToStart,
        noOneCanAct,
        onlyOneCanActAndBetsEqual,
        shouldCheckRoundCompletion
      });

      if (shouldCheckRoundCompletion) {
        // Round is complete if:
        // 1. All active players have equal bets this round, OR
        // 2. All players are all-in/folded (no one can act)
        const roundCompleteByAllIn = playersWhoCanAct.length === 0;
        const roundComplete = allBetsEqual || roundCompleteByAllIn;

        console.log('[PlaceBet] Checking round completion - allBetsEqual:', allBetsEqual, ', roundCompleteByAllIn:', roundCompleteByAllIn, ', playersWhoCanAct:', playersWhoCanAct.length);

        if (roundComplete) {
          console.log('[PlaceBet] Round complete - using StageManager for controlled stage advancement');

          // NEW: Use StageManager for controlled stage lifecycle
          const { StageManager } = await import('./stage-manager');

          // Mark current stage as complete
          StageManager.completeStage(game);

          // Determine what should happen next
          const nextAction = StageManager.getNextAction(game);
          console.log('[PlaceBet] StageManager.getNextAction():', nextAction);

          if (nextAction === 'end-game') {
            // At River - determine winner
            await StageManager.endGame(game);
            roundInfo = {
              roundComplete: true,
              cardsDealt: false,
              gameComplete: true
            };
          } else if (nextAction === 'auto-advance') {
            // All players all-in - start auto-advance sequence
            console.log('[PlaceBet] Starting auto-advance sequence (all players all-in)');
            const autoAdvanceResult = await StageManager.startAutoAdvanceSequence(game);

            roundInfo = {
              roundComplete: true,
              cardsDealt: autoAdvanceResult.cardsDealt,
              gameComplete: false // Game won't be complete until all stages finish
            };
          } else if (nextAction === 'advance') {
            // Normal stage advancement for Preflop/Flop/Turn/River
            if (game.stage === 0) {
              console.log('[PlaceBet] First betting round complete in Preflop stage - advancing to Flop');

              roundInfo = {
                roundComplete: true,
                cardsDealt: false,
                gameComplete: false
              };
            } else {
              console.log('[PlaceBet] Advancing to next stage (normal flow)');
              const advanced = await StageManager.advanceToNextStage(game);

              // Special case: If we just advanced to Showdown (stage 4), end the game immediately
              if (game.stage === 4) { // Showdown
                console.log('[PlaceBet] Advanced to Showdown - ending game immediately');
                await StageManager.endGame(game);
                roundInfo = {
                  roundComplete: true,
                  cardsDealt: false,
                  gameComplete: true
                };
              } else {
                roundInfo = {
                  roundComplete: true,
                  cardsDealt: advanced,
                  gameComplete: false
                };
              }
            }
          } else {
            // Continue betting in current stage
            console.log('[PlaceBet] Continuing betting in current stage');
            roundInfo = {
              roundComplete: false,
              cardsDealt: false,
              gameComplete: false
            };
          }
        }
        // DO NOT advance turn here - let turn-handler do it after notification completes
        // Client will signal ready_for_next_turn, then turn-handler advances the turn
      }

      // Log player chips before save
      console.log('[PlaceBet] Player chips before save:');
      game.players.forEach((p: Player, idx: number) => {
        console.log(`  Player ${idx} (${p.username}): chipCount=${p.chipCount}, isAllIn=${p.isAllIn}`);
      });

      // Save once with all changes (bet + potential stage advancement)
      // Release lock before save to prevent lock timeout issues
      game.processing = false;
      await game.save();

      // Clear any existing timer first (player has made their action)
      try {
        await clearActionTimer(gameId);
      } catch (timerError) {
        console.error('[PlaceBet] Failed to clear timer:', timerError);
        // Don't fail the bet if timer clear fails
      }

      */
    } catch (error) {
      // Release lock on error
      await releaseGameLock(gameId);
      throw error;
    }
  }, POKER_RETRY_CONFIG);
}

export async function fold(gameId: string, playerId: string) {
  return withRetry(async () => {
    // ATOMIC LOCK ACQUISITION
    const game = await acquireGameLock(gameId);

    try {
      const playerIndex = validatePlayerExists(game.players, playerId);
      const foldingPlayer = game.players[playerIndex];

      // Find the other player (winner)
      const [winner, otherPlayerIndex] = findOtherPlayer(game.players, playerId);
      if (!winner) throw new Error('No other player found');

      // Set winner information
      const winnerInfo = {
        winnerId: winner.id,
        winnerName: winner.username,
        handRank: 'Win by fold',
        isTie: false,
      };
      game.winner = winnerInfo;

      // Award pot chips to winner using shared utility
      awardPotToWinners(game, winnerInfo);

      // Reset all-in status for all players when winner is determined
      game.players = game.players.map((p: Player) => ({
        ...p,
        isAllIn: undefined,
        allInAmount: undefined,
      }));
      game.markModified('players'); // Mark modified after awarding pot and resetting all-in

      // Clear pot and end game
      game.pot = [];
      game.locked = false;

      // Save all players' chip balances
      await savePlayerBalances(game.players);

      // Add action history
      logFoldAction(game, playerId, foldingPlayer.username);

      const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');

      // Emit fold notification (event-based)
      // Send to all users (including acting user)
      // Acting user will skip showing duplicate notification but still signal ready
      await PokerSocketEmitter.emitNotification({
        notificationType: 'player_fold',
        category: 'action',
        playerId: playerId,
        playerName: foldingPlayer.username,
        isAI: foldingPlayer.isAI || false,
      });

      console.log(`[Fold] Fold notification emitted for ${foldingPlayer.username} (AI: ${foldingPlayer.isAI})`);

      // If AI folded, wait for notification to complete before emitting winner
      // Human players will trigger winner notification after fold notification completes on client
      if (foldingPlayer.isAI) {
        console.log('[Fold] AI fold - waiting for fold notification to complete before emitting winner');
        const { POKER_TIMERS } = await import('../config/poker-constants');
        await new Promise(resolve => setTimeout(resolve, POKER_TIMERS.NOTIFICATION_DURATION_MS));
      } else {
        // For human folds, add small buffer to ensure fold notification is sent first
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Emit winner notification (event-based)
      await PokerSocketEmitter.emitNotification({
        notificationType: 'winner_determined',
        category: 'info',
        winnerId: winner.id,
        winnerName: winner.username,
        handRank: winnerInfo.handRank,
      });

      console.log(`[Fold] Winner notification emitted for ${winner.username}`);

      // Log game ended in action history (for UI display only, not notifications)
      game.actionHistory.push({
        id: require('crypto').randomBytes(8).toString('hex'),
        timestamp: new Date(),
        stage: game.stage,
        actionType: ActionHistoryType.GAME_ENDED,
        winnerId: winner.id,
        winnerName: winner.username,
        handRank: winnerInfo.handRank,
      });
      game.markModified('actionHistory');

      // Clear timer since game ended - do this BEFORE saving
      game.actionTimer = undefined;
      game.markModified('actionTimer');
      console.log('[Fold] Timer cleared from game object');

      // Cancel the server-side setTimeout if it exists
      const { activeTimers } = await import('./poker-timer-controller');
      const existingTimer = activeTimers.get(gameId);
      if (existingTimer) {
        clearTimeout(existingTimer);
        activeTimers.delete(gameId);
        console.log('[Fold] Canceled server-side timer');
      }

      // Release lock before save to prevent lock timeout issues
      game.processing = false;
      await game.save();

      // Emit full game state update to show winner with timer already cleared
      await PokerSocketEmitter.emitStateUpdate(game.toObject());

      console.log(`[Fold] Fold complete - winner notification emitted`);
      console.log(`[Fold] Starting fully server-driven restart flow`);

      // FULLY SERVER-DRIVEN RESTART FLOW (eliminates client-triggered API calls that cause page refreshes):
      // 1. Server emits winner notification (done above)
      // 2. Client shows winner notification for 10s (purely visual, no callbacks)
      // 3. Server waits 10s then automatically resets game
      // 4. Server emits game_starting notification
      // 5. Client shows "Game starting!" notification for 10s (purely visual, no callbacks)
      // 6. Server waits 10s then automatically locks and starts new game

      const { POKER_GAME_CONFIG } = await import('../config/poker-constants');

      // Wait for winner notification to complete (10 seconds)
      console.log('[Fold] Waiting 10 seconds for winner notification to display');
      await new Promise(resolve => setTimeout(resolve, POKER_GAME_CONFIG.AUTO_LOCK_DELAY_MS));

      console.log('[Fold] Winner notification complete - starting game reset');

      // Fetch fresh game state for reset
      const gameForReset = await PokerGame.findById(gameId);
      if (!gameForReset) throw new Error('Game not found for reset');

      // Advance to End stage
      gameForReset.stage = GameStage.End;
      gameForReset.markModified('stage');
      await gameForReset.save();

      console.log('[Fold] Advanced to End stage - calling resetGameForNextRound');

      // Reset and restart the game (this will emit game_starting and auto-lock after 10s)
      const { StageManager } = await import('./stage-manager');
      await StageManager.resetGameForNextRound(gameForReset);

      console.log('[Fold] Game reset and restart flow complete');

      // Note: We don't wait for the full restart to complete before returning
      // The fold action is complete; restart happens asynchronously
      return game.toObject();
    } catch (error) {
      // Release lock on error
      await releaseGameLock(gameId);
      throw error;
    }
  }, POKER_RETRY_CONFIG);
}

export async function restart(gameId: string) {
  return withRetry(async () => {
    // ATOMIC LOCK ACQUISITION
    const game = await acquireGameLock(gameId);

    try {
      // Validate that we have enough players to restart (need at least 2)
      // Note: AI player is always present in singleton game
      if (game.players.length < 2) {
        console.warn(`[Restart] Not enough players to restart (${game.players.length} players)`);

        // Unlock game and clear winner so remaining player can invite others
        game.locked = false;
        game.winner = undefined;
        game.markModified('winner'); // Mark winner as modified
        game.processing = false;
        await game.save();

        // Emit state update to notify clients
        const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
        await PokerSocketEmitter.emitStateUpdate(game.toObject());

        throw new Error('Cannot restart game - need at least 2 players');
      }

      // Collect and reshuffle all cards using dealer module
      const deck = reshuffleAllCards(game.deck, game.communalCards, game.players);

      // Initialize players with empty hands and reset all-in flags from previous game
      const players = game.players.map((p: Player) => ({
        ...p,
        hand: [],
        isAllIn: undefined,
        allInAmount: undefined,
        folded: undefined,
      }));

      // ROTATE DEALER BUTTON for next hand (standard poker rules)
      game.dealerButtonPosition = ((game.dealerButtonPosition || 0) + 1) % game.players.length;

      // Don't deal cards yet - players should do blind betting first
      // Cards will be dealt automatically after first betting round completes
      game.communalCards = [];
      game.pot = [];
      game.stage = 0; // Start at Preflop
      game.locked = true;
      game.winner = undefined;
      game.stages = [];
      game.currentPlayerIndex = 0; // Will be set correctly by placeBigBlind
      game.playerBets = new Array(game.players.length).fill(0);
      game.deck = deck;
      game.players = players as any;
      game.actionTimer = undefined; // Clear any existing timer
      game.markModified('dealerButtonPosition'); // Mark modified for Mongoose
      game.markModified('winner'); // Mark winner as modified when clearing

      // Reset action history and add GAME_STARTED event
      game.actionHistory = [];
      logGameRestartAction(game);

      game.processing = false; // Release lock before save

      await game.save();

      // Clear any running server-side timers
      try {
        await clearActionTimer(gameId);
      } catch (timerError) {
        console.error('[Restart] Failed to clear timer:', timerError);
        // Don't fail restart if timer clear fails
      }

      // Emit game restart event to clear cards on all clients immediately
      const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
      await PokerSocketEmitter.emitGameRestart({
        stage: game.stage,
        locked: game.locked,
        players: game.players,
        communalCards: game.communalCards,
        pot: game.pot,
        playerBets: game.playerBets,
        currentPlayerIndex: game.currentPlayerIndex,
        dealerButtonPosition: game.dealerButtonPosition,
        actionHistory: game.actionHistory,
        winner: undefined, // Explicitly clear winner on restart
      });

      // Check and refill chips for players who don't have enough
      const { getBlindConfig } = await import('./blinds-manager');
      const { smallBlind, bigBlind } = getBlindConfig();

      // Calculate which players will post blinds based on button position
      const buttonPosition = game.dealerButtonPosition || 0;
      const smallBlindPos = game.players.length === 2 ? buttonPosition : (buttonPosition + 1) % game.players.length;
      const bigBlindPos = (buttonPosition + 1) % game.players.length;

      // Check each player's chips and refill if needed
      const playersNeedingChips: number[] = [];
      game.players.forEach((player: Player, index: number) => {
        const playerChips = player.chipCount || 0;
        const requiredChips = index === smallBlindPos ? smallBlind : (index === bigBlindPos ? bigBlind : 0);

        if (playerChips < requiredChips) {
          playersNeedingChips.push(index);
        }
      });

      // Refill chips for players who don't have enough
      if (playersNeedingChips.length > 0) {
        console.log(`[Restart] Refilling chips for ${playersNeedingChips.length} player(s) who ran out`);

        for (const playerIndex of playersNeedingChips) {
          const player = game.players[playerIndex];
          const newChipCount = POKER_GAME_CONFIG.DEFAULT_STARTING_CHIPS;
          player.chipCount = newChipCount;

          // Update their balance in the database
          await PokerBalance.findOneAndUpdate(
            { userId: player.id },
            { chipCount: newChipCount },
            { upsert: true }
          );

          console.log(`[Restart] Refilled ${player.username} with ${POKER_GAME_CONFIG.DEFAULT_STARTING_CHIPS} chips`);
        }

        game.markModified('players');
      }

      // PLACE SMALL BLIND automatically without notification
      const smallBlindInfo = placeSmallBlind(game);
      console.log(`[Restart] Small blind posted by ${smallBlindInfo.player.username}: ${smallBlindInfo.amount} chips`);

      // PLACE BIG BLIND automatically without notification
      const bigBlindInfo = placeBigBlind(game);
      console.log(`[Restart] Big blind posted by ${bigBlindInfo.player.username}: ${bigBlindInfo.amount} chips`);

      // DEAL HOLE CARDS automatically after blinds (no notification)
      dealPlayerCards(game.deck, game.players, 2);
      game.markModified('deck');
      game.markModified('players');

      // Add action history for dealing hole cards
      game.actionHistory.push({
        id: require('crypto').randomBytes(8).toString('hex'),
        timestamp: new Date(),
        stage: 0, // Preflop
        actionType: ActionHistoryType.CARDS_DEALT,
        cardsDealt: 2,
      });
      game.markModified('actionHistory');

      console.log(`[Restart] Hole cards dealt to all players`);

      await game.save();

      // Auto-start timer for player after big blind and cards dealt
      // Timer starts for both human and AI players - AI will act quickly and cancel timer
      const currentPlayer = game.players[game.currentPlayerIndex];
      if (currentPlayer) {
        try {
          await startActionTimer(
            gameId,
            POKER_TIMERS.ACTION_DURATION_SECONDS,
            GameActionType.PLAYER_BET,
            currentPlayer.id
          );

          // If current player is AI, trigger action immediately after timer starts
          if (currentPlayer.isAI) {
            console.log('[Restart] Timer started for AI player - triggering immediate action');
            const { executeAIActionIfReady } = await import('./ai-player-manager');
            executeAIActionIfReady(gameId).catch(error => {
              console.error('[Restart] AI action failed:', error);
            });
          }
        } catch (timerError) {
          console.error('[Restart] Failed to start timer for current player:', timerError);
          // Don't fail restart if timer fails
        }
      }

      return game.toObject();
    } catch (error) {
      // Release lock on error
      await releaseGameLock(gameId);
      throw error;
    }
  }, POKER_RETRY_CONFIG);
}

export async function deleteGame(gameId: string) {
  const result = await PokerGame.findByIdAndDelete(gameId);
  if (!result) throw new Error('Game not found');
  return { success: true };
}

// Re-export timer functions for backward compatibility
export { startActionTimer, clearActionTimer, pauseActionTimer, resumeActionTimer, setTurnTimerAction } from './poker-timer-controller';
