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
import { savePlayerBalances, awardPotToWinners } from '../flow/poker-game-flow';
import { dealPlayerCards, reshuffleAllCards, initializeDeck } from '../flow/poker-dealer';
import { startActionTimer, clearActionTimer, pauseActionTimer, resumeActionTimer } from '../timers/poker-timer-controller';
import { ensurePlayerBetsInitialized, processBetTransaction, updateGameAfterBet } from './bet-processor';
import { validatePlayerExists, getActivePlayerUsernames, findOtherPlayer, getActivePlayers } from '@/app/poker/lib/utils/player-helpers';
import { shouldStartLockTimer } from '../locking/game-lock-manager';
import { getPlayerChipCount } from '@/app/poker/lib/utils/side-pot-calculator';
import { TurnManager } from '../turn/turn-manager';
import { PokerSocketEmitter } from '@/app/lib/utils/socket-helper';

// Import refactored utilities
import { POKER_GAME_CONFIG, POKER_TIMERS, POKER_RETRY_CONFIG } from '@/app/poker/lib/config/poker-constants';
import { acquireGameLock, releaseGameLock } from '../locking/game-lock-utils';
import {
  logBetAction,
  logFoldAction,
  logPlayerJoinAction,
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

    // Set lockTime flag when we have 2+ total players (used to trigger notification queue)
    // Note: AI player is always present in singleton game, so this will trigger when first human joins
    // The actual game lock is scheduled by the notification queue AFTER the countdown completes
    if (game.players.length >= 2 && !game.locked) {
      const lockTime = new Date(Date.now() + POKER_GAME_CONFIG.AUTO_LOCK_DELAY_MS);
      game.lockTime = lockTime;
      await PokerGame.findByIdAndUpdate(gameId, { lockTime });
      // NOTE: scheduleGameLock is called by notification queue after countdown completes
      const humanCount = game.players.filter((p: Player) => !p.isAI).length;
      console.log(`[AddPlayer] ${humanCount === 1 ? 'Set' : 'Reset'} lockTime flag for notification queue (${game.players.length} total players: ${humanCount} human + AI)`);
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

    // Fetch game document and log player join action
    const updatedGame = await PokerGame.findById(gameId);
    if (updatedGame) {
      logPlayerJoinAction(updatedGame, userId, username || 'Guest');
      await updatedGame.save();
    }
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

    // If this player join brings the count to 2+ and game isn't locked, queue notifications
    if (gameState.players.length >= 2 && !gameState.locked && gameState.lockTime) {
      console.log('[HandlePlayerJoin] Queueing notification sequence for player join');

      // Import notification queue manager
      const { queuePlayerJoinedNotification } = await import('../notifications/notification-queue-manager');

      // Queue player joined notification (this will automatically handle game_starting notification)
      await queuePlayerJoinedNotification(gameId, username, userId);
    }

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

    // Players can only leave when game is unlocked
    if (gameBefore.locked) {
      return { success: false, gameState: null, error: 'Cannot leave - game is in progress' };
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

// ===== REMOVE PLAYER HELPER FUNCTIONS =====

/**
 * Remove player from players array and track context
 */
function removePlayerFromGame(
  game: any,
  userId: string
): {
  leavingPlayer: Player | undefined;
  wasCurrentPlayer: boolean;
  leavingPlayerIndex: number;
} {
  const leavingPlayer = game.players.find((p: Player) => p.id === userId);
  const wasCurrentPlayer = game.players[game.currentPlayerIndex]?.id === userId;
  const leavingPlayerIndex = game.players.findIndex((p: Player) => p.id === userId);

  game.players = game.players.filter((p: Player) => p.id !== userId);
  game.markModified('players');

  return { leavingPlayer, wasCurrentPlayer, leavingPlayerIndex };
}

/**
 * Manage lock timer based on player count after removal
 */
async function manageLockTimerAfterRemoval(game: any, gameId: string): Promise<void> {
  if (game.players.length < 2) {
    // Cancel lock timer if player count drops below 2
    const { cancelGameLock } = await import('../locking/game-lock-manager');
    cancelGameLock(gameId);
    game.lockTime = undefined;
    await PokerGame.findByIdAndUpdate(gameId, { lockTime: undefined });
    console.log('[RemovePlayer] Cancelled auto-lock timer - less than 2 players');

    // CRITICAL: Cancel any active "Game starting!" notification
    await PokerSocketEmitter.emitNotificationCanceled();
    console.log('[RemovePlayer] Cancelled game starting notification - insufficient players');
  } else if (game.players.length >= 2 && !game.locked) {
    // Reset lockTime flag if 2+ players remain
    const lockTime = new Date(Date.now() + POKER_GAME_CONFIG.AUTO_LOCK_DELAY_MS);
    game.lockTime = lockTime;
    await PokerGame.findByIdAndUpdate(gameId, { lockTime });
    console.log(`[RemovePlayer] Reset lockTime flag for notification queue`);
  }

  // Log if only AI player remains
  const humanCount = game.players.filter((p: Player) => !p.isAI).length;
  if (humanCount === 0) {
    console.log('[RemovePlayer] No human players remain - only AI player left');
  }
}

/**
 * Adjust current player index after player removal
 */
function adjustCurrentPlayerIndex(
  game: any,
  wasCurrentPlayer: boolean,
  leavingPlayerIndex: number
): void {
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
}

/**
 * Reset game state when only one player remains
 */
async function resetGameForSinglePlayer(game: any, gameId: string): Promise<void> {
  game.locked = false;
  game.lockTime = undefined;
  game.winner = undefined;
  game.pot = [];
  game.pots = [];
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
  game.markModified('winner');
  game.markModified('locked');
  game.markModified('pot');
  game.markModified('pots');
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

    // Quick exit if player not in game
    const isPlayer = game.players.some((p: Player) => p.id === user.id);
    if (!isPlayer) return game.toObject();

    // STEP 1: Remove player from game and track context
    const { leavingPlayer, wasCurrentPlayer, leavingPlayerIndex } = removePlayerFromGame(game, user.id);
    await game.save();

    // STEP 2: Manage lock timer based on player count
    await manageLockTimerAfterRemoval(game, gameId);

    // STEP 3: Adjust current player index if needed
    adjustCurrentPlayerIndex(game, wasCurrentPlayer, leavingPlayerIndex);

    // STEP 4: Reset game state if only one player remains
    if (game.players.length === 1) {
      await resetGameForSinglePlayer(game, gameId);
    }

    // STEP 5: Log action history
    if (leavingPlayer) {
      logPlayerLeftAction(game, user.id, leavingPlayer.username);
    }

    await game.save();

    // Return fresh game state
    const finalGame = await PokerGame.findById(gameId);
    return finalGame ? finalGame.toObject() : game.toObject();
  }, POKER_RETRY_CONFIG);
}

// ===== PLACE BET HELPER FUNCTIONS =====

/**
 * Validates that a bet request is valid
 * @returns Object with validation status and context data
 */
async function validateBetRequest(
  game: any,
  playerId: string,
  chipCount: number
): Promise<{
  playerIndex: number;
  player: Player;
  betToCall: number;
  currentPlayerBetAmount: number;
  betAlreadyProcessed: boolean;
}> {
  // Validate player exists and get index
  const playerIndex = validatePlayerExists(game.players, playerId);
  const player = game.players[playerIndex];

  // Prevent betting during Showdown or END stages
  if (game.stage >= 4) {
    throw new Error('Cannot bet - game has ended');
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

  // Check if this bet was already processed
  const currentPlayerBetAmount = game.playerBets[playerIndex] || 0;
  const expectedNewBetAmount = currentPlayerBetAmount + chipCount;

  let betAlreadyProcessed = false;
  if (chipCount > 0) {
    betAlreadyProcessed = currentPlayerBetAmount >= expectedNewBetAmount;
  } else {
    // For checks, only process if it's still this player's turn
    betAlreadyProcessed = game.currentPlayerIndex !== playerIndex;
  }

  return {
    playerIndex,
    player,
    betToCall,
    currentPlayerBetAmount,
    betAlreadyProcessed,
  };
}

/**
 * Process the actual bet amount and update game state
 */
function processBetAmountAndUpdateState(
  game: any,
  playerIndex: number,
  player: Player,
  chipCount: number
): { wentAllIn: boolean; actualChipCount: number } {
  // Ensure player bets are initialized
  ensurePlayerBetsInitialized(game);

  // Process the bet transaction (handles all-in automatically)
  const { player: updatedPlayer, chipsToAdd, actualChipCount, wentAllIn } = processBetTransaction(player, chipCount);

  // Update game state with actual chip count
  updateGameAfterBet(game, playerIndex, chipCount, updatedPlayer, chipsToAdd, actualChipCount);

  return { wentAllIn, actualChipCount };
}

/**
 * Emit bet notification to all players
 * @returns true if notification was emitted, false if duplicate was detected
 */
async function emitBetNotification(
  game: any,
  playerId: string,
  player: Player,
  chipCount: number,
  currentPlayerBetAmount: number,
  playerIndex: number,
  timerTriggered: boolean
): Promise<boolean> {
  // Check for duplicate actions in recent history
  const now = new Date();
  const oneSecondAgo = new Date(now.getTime() - POKER_TIMERS.ACTION_HISTORY_DEDUP_WINDOW_MS);
  const isBlindPost = false; // Regular play bets are never blind posts

  const recentBetActions = game.actionHistory.filter((action: any) =>
    action.actionType === ActionHistoryType.PLAYER_BET &&
    action.playerId === playerId &&
    action.stage === game.stage &&
    action.chipAmount === chipCount &&
    action.isBlind === isBlindPost &&
    action.timestamp && new Date(action.timestamp) > oneSecondAgo
  );

  console.log(`[PlaceBet] Checking for duplicate bet actions for ${player.username} (AI: ${player.isAI}):`, {
    playerId,
    stage: game.stage,
    chipCount,
    isBlindPost,
    recentActionsCount: recentBetActions.length,
  });

  // Skip if duplicate detected
  if (recentBetActions.length > 0) {
    console.warn(`[PlaceBet] SKIPPING notification - duplicate detected within last second`);
    return false;
  }

  // Log action
  console.log(`[PlaceBet] Logging bet action and emitting notification for ${player.username}, chipCount: ${chipCount}`);
  logBetAction(game, playerId, player.username, chipCount);

  // Calculate bet to call (BEFORE this action)
  const { calculateCurrentBet } = await import('@/app/poker/lib/utils/betting-helpers');
  const betToCall = calculateCurrentBet(
    game.playerBets.map((bet: number, idx: number) => idx === playerIndex ? currentPlayerBetAmount : bet),
    playerIndex,
    game.players
  );

  // Determine notification type
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

  console.log(`[PlaceBet] *** EMITTING NOTIFICATION: ${notificationType} for ${player.username}, chips: ${chipCount} ***`);

  // Emit notification
  await PokerSocketEmitter.emitNotification({
    notificationType,
    category: 'action',
    playerId,
    playerName: player.username,
    chipAmount: chipCount,
    isAI: player.isAI || false,
    timerTriggered,
    pot: JSON.parse(JSON.stringify(game.pot)),
    playerBets: [...game.playerBets],
    currentPlayerIndex: game.currentPlayerIndex,
  });

  console.log(`[PlaceBet] *** NOTIFICATION EMITTED SUCCESSFULLY ***`);
  return true;
}

/**
 * Finalize bet action: clear timer, save game, emit state update, schedule turn advancement
 */
async function finalizeBetAction(
  game: any,
  gameId: string,
  playerId: string,
  playerIsAI: boolean
): Promise<void> {
  // Clear timer from game object
  game.actionTimer = undefined;
  game.markModified('actionTimer');
  console.log('[PlaceBet] Timer cleared from game object');

  // Cancel server-side setTimeout
  const { activeTimers } = await import('../timers/poker-timer-controller');
  const existingTimer = activeTimers.get(gameId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    activeTimers.delete(gameId);
    console.log('[PlaceBet] Canceled server-side timer');
  }

  // Release lock and save
  game.processing = false;
  await game.save();

  // Emit state update
  await PokerSocketEmitter.emitStateUpdate(game.toObject());

  // Signal step orchestrator
  const { onPlayerAction } = await import('../flow/step-orchestrator');
  await onPlayerAction(gameId, playerId, 'bet');

  // Schedule turn advancement after notification completes
  console.log(`[PlaceBet] ${playerIsAI ? 'AI' : 'Manual'} action - scheduling turn advancement after notification (${POKER_TIMERS.PLAYER_ACTION_NOTIFICATION_DURATION_MS}ms)`);

  setTimeout(async () => {
    console.log('[PlaceBet] Notification complete - advancing turn');
    const { handleReadyForNextTurn } = await import('../turn/turn-handler');
    try {
      await handleReadyForNextTurn(gameId);
      console.log('[PlaceBet] Turn advancement completed');
    } catch (error) {
      console.error('[PlaceBet] Turn advancement error:', error);
    }
  }, POKER_TIMERS.PLAYER_ACTION_NOTIFICATION_DURATION_MS);
}

export async function placeBet(gameId: string, playerId: string, chipCount = 1, timerTriggered = false) {
  // Retry with fresh state fetch on each attempt to avoid double-betting
  return withRetry(async () => {
    // ATOMIC LOCK ACQUISITION
    const game = await acquireGameLock(gameId);

    try {
      // VALIDATION GATE: Use TurnManager to validate player can act
      const turnValidation = TurnManager.validatePlayerCanAct(game, playerId);
      if (!turnValidation.valid) {
        console.error('[PlaceBet] Turn validation failed:', turnValidation.errors);
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

      // STEP 1: Validate the bet request
      const validation = await validateBetRequest(game, playerId, chipCount);
      const { playerIndex, player, currentPlayerBetAmount, betAlreadyProcessed } = validation;

      // STEP 2: Process bet if not already processed
      if (!betAlreadyProcessed) {
        const { wentAllIn, actualChipCount } = processBetAmountAndUpdateState(
          game,
          playerIndex,
          player,
          chipCount
        );

        if (wentAllIn) {
          console.log(`[PlaceBet] Player ${player.username} went ALL-IN with ${actualChipCount} chips`);
        }
      }

      // STEP 3: Emit bet notification (with deduplication)
      await emitBetNotification(
        game,
        playerId,
        player,
        chipCount,
        currentPlayerBetAmount,
        playerIndex,
        timerTriggered
      );

      // STEP 4: Finalize action (clear timer, save, schedule turn advancement)
      console.log('[PlaceBet] Action processed - deferring turn/stage advancement until client signals ready');
      await finalizeBetAction(game, gameId, playerId, player.isAI || false);

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

    } catch (error) {
      // Release lock on error
      await releaseGameLock(gameId);
      throw error;
    }
  }, POKER_RETRY_CONFIG);
}

// ===== FOLD HELPER FUNCTIONS =====

/**
 * Validates that a fold request is valid and returns player context
 */
async function validateFoldRequest(
  game: any,
  playerId: string
): Promise<{
  playerIndex: number;
  foldingPlayer: Player;
}> {
  const playerIndex = validatePlayerExists(game.players, playerId);
  const foldingPlayer = game.players[playerIndex];

  // Check that player hasn't already folded
  if (foldingPlayer.folded) {
    throw new Error('Player has already folded');
  }

  return { playerIndex, foldingPlayer };
}

/**
 * Find the last remaining active player (winner by fold)
 */
function findLastActivePlayer(game: any): { winner: Player; winnerIndex: number } | null {
  const activePlayers = getActivePlayers(game.players);

  if (activePlayers.length !== 1) {
    return null;
  }

  const winner = activePlayers[0];
  const winnerIndex = game.players.findIndex((p: Player) => p.id === winner.id);

  return { winner, winnerIndex };
}

/**
 * Process fold logic: set winner, award pot, reset player states
 */
function processFoldAndDetermineWinner(
  game: any,
  winner: Player,
  foldingPlayer: Player
): { handRank: string; winnerId: string; winnerName: string; isTie: boolean } {
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
  game.pots = [];
  game.locked = false;

  return winnerInfo;
}

/**
 * Emit fold and winner notifications with proper timing
 */
async function emitFoldNotifications(
  playerId: string,
  foldingPlayer: Player,
  winner: Player,
  winnerInfo: { winnerId: string; winnerName: string; handRank: string },
  timerTriggered: boolean
): Promise<void> {
  // Emit fold notification (event-based)
  await PokerSocketEmitter.emitNotification({
    notificationType: 'player_fold',
    category: 'action',
    playerId: playerId,
    playerName: foldingPlayer.username,
    isAI: foldingPlayer.isAI || false,
    timerTriggered,
  });

  console.log(`[Fold] Fold notification emitted for ${foldingPlayer.username} (AI: ${foldingPlayer.isAI}, timerTriggered: ${timerTriggered})`);

  // Wait for fold notification to complete before emitting winner
  if (foldingPlayer.isAI || timerTriggered) {
    console.log(`[Fold] ${foldingPlayer.isAI ? 'AI' : 'Timer-triggered'} fold - waiting for fold notification to complete`);
    await new Promise(resolve => setTimeout(resolve, POKER_TIMERS.PLAYER_ACTION_NOTIFICATION_DURATION_MS));
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
}

/**
 * Finalize fold when game continues (multiple active players remain)
 * Similar to finalizeBetAction - schedules turn advancement
 */
async function finalizeFoldAndContinue(
  game: any,
  gameId: string,
  playerId: string,
  foldingPlayer: Player
): Promise<void> {
  // Log fold action in history
  logFoldAction(game, playerId, foldingPlayer.username);

  // Clear timer from game object
  game.actionTimer = undefined;
  game.markModified('actionTimer');
  console.log('[Fold] Timer cleared from game object');

  // Cancel server-side setTimeout
  const { activeTimers } = await import('../timers/poker-timer-controller');
  const existingTimer = activeTimers.get(gameId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    activeTimers.delete(gameId);
    console.log('[Fold] Canceled server-side timer');
  }

  // Release lock and save
  game.processing = false;
  await game.save();

  // Emit state update
  await PokerSocketEmitter.emitStateUpdate(game.toObject());

  // Signal step orchestrator
  const { onPlayerAction } = await import('../flow/step-orchestrator');
  await onPlayerAction(gameId, playerId, 'fold');

  // Schedule turn advancement after notification completes
  console.log(`[Fold] Game continues - scheduling turn advancement after notification (${POKER_TIMERS.PLAYER_ACTION_NOTIFICATION_DURATION_MS}ms)`);

  setTimeout(async () => {
    console.log('[Fold] Notification complete - advancing turn');
    const { handleReadyForNextTurn } = await import('../turn/turn-handler');
    try {
      await handleReadyForNextTurn(gameId);
      console.log('[Fold] Turn advancement completed');
    } catch (error) {
      console.error('[Fold] Turn advancement error:', error);
    }
  }, POKER_TIMERS.PLAYER_ACTION_NOTIFICATION_DURATION_MS);
}

/**
 * Finalize fold action when game ends: log history, clear timer, save game, trigger restart
 */
async function finalizeFoldAndTriggerRestart(
  game: any,
  gameId: string,
  playerId: string,
  foldingPlayer: Player,
  winner: Player,
  winnerInfo: { winnerId: string; winnerName: string; handRank: string }
): Promise<void> {
  // Save all players' chip balances
  await savePlayerBalances(game.players);

  // Add action history
  logFoldAction(game, playerId, foldingPlayer.username);

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
  const { activeTimers } = await import('../timers/poker-timer-controller');
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
  const { StageManager } = await import('../flow/stage-manager');
  await StageManager.resetGameForNextRound(gameForReset);

  console.log('[Fold] Game reset and restart flow complete');
}

export async function fold(gameId: string, playerId: string, timerTriggered = false) {
  return withRetry(async () => {
    // ATOMIC LOCK ACQUISITION
    const game = await acquireGameLock(gameId);

    try {
      // STEP 1: Validate fold request and get player context
      const { playerIndex, foldingPlayer } = await validateFoldRequest(game, playerId);

      // STEP 2: Mark player as folded
      game.players[playerIndex].folded = true;
      game.markModified('players');

      console.log(`[Fold] Player ${foldingPlayer.username} folded`);

      // STEP 3: Check how many active players remain
      const activePlayers = getActivePlayers(game.players);
      console.log(`[Fold] Active players remaining: ${activePlayers.length}`);

      if (activePlayers.length === 1) {
        // Only one player left - they win by fold
        const winner = activePlayers[0];
        console.log(`[Fold] Last active player is ${winner.username} - they win by fold`);

        // Process fold and determine winner
        const winnerInfo = processFoldAndDetermineWinner(game, winner, foldingPlayer);

        // Emit fold and winner notifications with proper timing
        await emitFoldNotifications(playerId, foldingPlayer, winner, winnerInfo, timerTriggered);

        // Finalize fold action and trigger restart flow
        await finalizeFoldAndTriggerRestart(game, gameId, playerId, foldingPlayer, winner, winnerInfo);
      } else {
        // Multiple active players remain - game continues
        console.log(`[Fold] Game continues with ${activePlayers.length} active players`);

        // Emit fold notification (event-based)
        await PokerSocketEmitter.emitNotification({
          notificationType: 'player_fold',
          category: 'action',
          playerId: playerId,
          playerName: foldingPlayer.username,
          isAI: foldingPlayer.isAI || false,
          timerTriggered,
        });

        // Finalize and continue the game (advance to next player)
        await finalizeFoldAndContinue(game, gameId, playerId, foldingPlayer);
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
export { startActionTimer, clearActionTimer, pauseActionTimer, resumeActionTimer, setTurnTimerAction } from '../timers/poker-timer-controller';
