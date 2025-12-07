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
  user: { id: string; username: string },
  options: { skipLockTimeReset?: boolean } = {}
) {
  const { isGuestId } = await import('@/app/poker/lib/utils/guest-utils');
  const isGuest = isGuestId(user.id);

  let playerChipCount: number = POKER_GAME_CONFIG.DEFAULT_STARTING_CHIPS;

  // Skip balance operations for guest players
  if (!isGuest) {
    // Get or create balance ONCE before retry loop to avoid duplicate creation
    const balanceDoc = await PokerBalance.findOne({ userId: user.id }).lean();

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
      } else {
        // Balance exists but has no chips, set to default
        await PokerBalance.findOneAndUpdate(
          { userId: user.id },
          { $set: { chipCount: playerChipCount } }
        );
      }
    } else {
      // Create new balance record with starting chips
      await PokerBalance.create({ userId: user.id, chipCount: playerChipCount });
    }

    // Reset balance to default if insufficient for big blind
    if (playerChipCount < POKER_GAME_CONFIG.BIG_BLIND) {
      playerChipCount = POKER_GAME_CONFIG.DEFAULT_STARTING_CHIPS;

      // Update the balance in database
      await PokerBalance.findOneAndUpdate(
        { userId: user.id },
        { $set: { chipCount: playerChipCount } }
      );
    }
  } else {
    // Guest players always start with default chips (no persistence)
  }

  // Retry logic for version conflicts
  return withRetry(async () => {
    const game = await PokerGame.findById(gameId);
    if (!game) throw new Error('Game not found');

    // Check if game is locked - if so, add to queue instead
    if (game.locked) {
      // Check if player already in queue
      const alreadyQueued = game.queuedPlayers?.some((p: { id: string }) => p.id === user.id);
      if (alreadyQueued) {
        return game.toObject();
      }

      // Check if player already in game
      const alreadyIn = game.players.some((p: Player) => p.id === user.id);
      if (alreadyIn) {
        return game.toObject();
      }

      // Add to queue
      if (!game.queuedPlayers) {
        game.queuedPlayers = [];
      }
      game.queuedPlayers.push({ id: user.id, username: user.username });
      game.markModified('queuedPlayers');
      await game.save();

      // Emit notification to player that they've been queued
      await PokerSocketEmitter.emitNotification({
        notificationType: 'player_queued',
        category: 'info',
        playerId: user.id,
        playerName: user.username,
      });

      return game.toObject();
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
      isGuest,
    });

    // Explicitly mark players array as modified for Mongoose
    game.markModified('players');

    await game.save();

    // Set/Reset lockTime flag when we have 2+ total players (used to trigger notification queue)
    // Note: AI player is always present in singleton game, so this will trigger when first human joins
    // IMPORTANT: Always reset lockTime when a new player joins to give everyone the full countdown
    // lockTime must account for BOTH player_joined notification (2s) AND game_starting notification (10s)
    // SKIP this when adding queued players (they shouldn't reset the existing countdown)
    if (game.players.length >= 2 && !game.locked && !options.skipLockTimeReset) {
      const totalNotificationDuration =
        POKER_GAME_CONFIG.PLAYER_JOINED_NOTIFICATION_DURATION_MS +
        POKER_GAME_CONFIG.AUTO_LOCK_DELAY_MS;
      const lockTime = new Date(Date.now() + totalNotificationDuration);
      game.lockTime = lockTime;
      await PokerGame.findByIdAndUpdate(gameId, { lockTime });
      const humanCount = game.players.filter((p: Player) => !p.isAI).length;
    }

    // Return fresh game state
    const finalGame = await PokerGame.findById(gameId);
    return finalGame ? finalGame.toObject() : game.toObject();
  }, POKER_RETRY_CONFIG);
}

/**
 * Process queued players and add them to the game when it unlocks
 * Called after game resets and unlocks
 */
export async function processQueuedPlayers(gameId: string): Promise<void> {
  const game = await PokerGame.findById(gameId);
  if (!game) {
    console.error('[ProcessQueuedPlayers] Game not found');
    return;
  }

  // No queued players to process
  if (!game.queuedPlayers || game.queuedPlayers.length === 0) {
    return;
  }

  // Game is still locked, can't process queue yet
  if (game.locked) {
    console.warn('[ProcessQueuedPlayers] Game is still locked, cannot process queue');
    return;
  }

  const queuedPlayersList = [...game.queuedPlayers];
  const playersToAdd: Array<{ id: string; username: string }> = [];

  // Determine how many players we can add
  const availableSlots = POKER_GAME_CONFIG.MAX_PLAYERS - game.players.length;

  for (let i = 0; i < Math.min(queuedPlayersList.length, availableSlots); i++) {
    playersToAdd.push(queuedPlayersList[i]);
  }

  if (playersToAdd.length === 0) {
    return;
  }

  // Add players from queue
  // IMPORTANT: Skip lockTime reset so the existing game start countdown isn't reset
  for (const queuedPlayer of playersToAdd) {
    try {
      const result = await handlePlayerJoin(
        gameId,
        queuedPlayer.id,
        queuedPlayer.username,
        { skipLockTimeReset: true } // Don't reset the countdown when adding queued players
      );
      if (result.success) {
        console.log(`[ProcessQueuedPlayers] Added ${queuedPlayer.username} from queue`);
      } else {
        console.error(`[ProcessQueuedPlayers] Failed to add ${queuedPlayer.username}:`, result.error);
      }
    } catch (error: any) {
      console.error(`[ProcessQueuedPlayers] Error adding ${queuedPlayer.username}:`, error.message);
    }
  }

  // Remove processed players from queue
  const freshGame = await PokerGame.findById(gameId);
  if (freshGame && freshGame.queuedPlayers) {
    freshGame.queuedPlayers = freshGame.queuedPlayers.filter(
      (qp: { id: string }) => !playersToAdd.some(p => p.id === qp.id)
    );
    freshGame.markModified('queuedPlayers');
    await freshGame.save();
  }
}

/**
 * Handle complete player join flow including emissions and notifications
 * Consolidates logic from /api/poker/join and /api/socket/emit routes
 */
export async function handlePlayerJoin(
  gameId: string,
  userId: string,
  username: string,
  options: { skipLockTimeReset?: boolean } = {}
): Promise<{ success: boolean; gameState: any; error?: string }> {
  try {
    // Add player to game
    const gameState = await addPlayer(gameId, {
      id: userId,
      username: username || 'Guest',
    }, options);

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
    // Note: lockTime may be undefined during restart, but we still queue notifications to cancel timers
    if (gameState.players.length >= 2 && !gameState.locked) {
      const context = gameState.lockTime ? 'initial join' : 'join during restart';

      // Import notification queue manager
      const { queuePlayerJoinedNotification } = await import('../notifications/notification-queue-manager');

      // Queue player joined notification (cancels any active timers and resets countdown)
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

    // Emit dealer button update so clients update the dealer position
    if (gameState.players.length > 0) {
      await PokerSocketEmitter.emitDealerButtonMoved({
        dealerButtonPosition: gameState.dealerButtonPosition,
      });
    }

    // If game was reset (< 2 players remain), send full state update to sync hands, cards, etc.
    if (gameState.players.length < 2) {
      await PokerSocketEmitter.emitStateUpdate(gameState);
    } else {
      // If 2+ players remain, reset the game starting timer
      const { resetGameStartingOnPlayerLeave } = await import('../notifications/notification-queue-manager');
      await resetGameStartingOnPlayerLeave(gameId);
    }

    return { success: true, gameState: serializedState };
  } catch (error: any) {
    const errorMessage = error?.message || 'Failed to leave game';
    console.error('[HandlePlayerLeave] Error:', errorMessage);
    return { success: false, gameState: null, error: errorMessage };
  }
}

/**
 * Set player presence (away/present) and notify all clients
 */
export async function setPlayerPresence(
  gameId: string,
  userId: string,
  isAway: boolean
): Promise<void> {
  const game = await PokerGame.findById(gameId);
  if (!game) {
    throw new Error('Game not found');
  }

  let playerIndex = game.players.findIndex((p: Player) => p.id === userId);

  // If player not found and userId is 'guest-pending', this is a guest who returned
  // For singleton game, find the guest player (there should only be one active guest)
  if (playerIndex === -1 && userId === 'guest-pending') {
    // Find any guest player (there should only be one per game session)
    const guestPlayers = game.players.filter((p: Player) => p.id.startsWith('guest-') && !p.isAI);
    if (guestPlayers.length === 1) {
      playerIndex = game.players.findIndex((p: Player) => p.id === guestPlayers[0].id);
    } else if (guestPlayers.length > 1) {
      // Multiple guests - can't determine which one without more context
      console.warn('[SetPlayerPresence] Multiple guest players found, cannot determine which reconnected');
      throw new Error('Cannot identify guest player - multiple guests in game');
    }
  }

  if (playerIndex === -1) {
    // Player not in game - this is common and not an error
    // Happens when: player left, was removed during reset, or timing issues
    console.log(`[SetPlayerPresence] Player ${userId} not in game ${gameId} - ignoring presence update`);
    return; // Silent no-op
  }

  const actualPlayerId = game.players[playerIndex].id;

  // Update player presence
  game.players[playerIndex].isAway = isAway;
  game.markModified('players');
  await game.save();

  // Emit presence update to all clients with the actual player ID
  await PokerSocketEmitter.emitPlayerPresenceUpdated({
    playerId: actualPlayerId,
    isAway,
  });
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
  wasDealer: boolean;
} {
  const leavingPlayer = game.players.find((p: Player) => p.id === userId);
  const wasCurrentPlayer = game.players[game.currentPlayerIndex]?.id === userId;
  const leavingPlayerIndex = game.players.findIndex((p: Player) => p.id === userId);
  const wasDealer = (game.dealerButtonPosition || 0) === leavingPlayerIndex;

  game.players = game.players.filter((p: Player) => p.id !== userId);
  game.markModified('players');

  return { leavingPlayer, wasCurrentPlayer, leavingPlayerIndex, wasDealer };
}

/**
 * Adjust dealer button position after a player leaves
 */
function adjustDealerButtonPosition(
  game: any,
  leavingPlayerIndex: number,
  wasDealer: boolean
): void {
  if (game.players.length === 0) {
    // No players left, reset to 0
    game.dealerButtonPosition = 0;
  } else {
    const currentDealerPosition = game.dealerButtonPosition || 0;

    if (wasDealer) {
      // Dealer left - button stays at same index (which is now the next player)
      // But need to wrap if at end
      game.dealerButtonPosition = leavingPlayerIndex % game.players.length;
    } else if (leavingPlayerIndex < currentDealerPosition) {
      // Player before dealer left - decrement dealer position
      game.dealerButtonPosition = currentDealerPosition - 1;
    }
    // If player after dealer left, no adjustment needed
  }

  game.markModified('dealerButtonPosition');
}

/**
 * Manage lock timer based on player count after removal
 */
async function manageLockTimerAfterRemoval(game: any, gameId: string): Promise<void> {
  // Count human players (AI player doesn't count toward game start requirements)
  const humanCount = game.players.filter((p: Player) => !p.isAI).length;

  if (humanCount < 2) {
    // Cancel lock timer if human player count drops below 2
    const { cancelGameLock } = await import('../locking/game-lock-manager');
    cancelGameLock(gameId);
    game.lockTime = undefined;
    await PokerGame.findByIdAndUpdate(gameId, { lockTime: undefined });

    // CRITICAL: Clear the notification queue and cancel any active notification
    const { clearQueue } = await import('../notifications/notification-queue-manager');
    clearQueue(gameId);
    await PokerSocketEmitter.emitNotificationCanceled();
  } else if (humanCount >= 2 && !game.locked) {
    // Reset lockTime flag if 2+ human players remain
    const lockTime = new Date(Date.now() + POKER_GAME_CONFIG.AUTO_LOCK_DELAY_MS);
    game.lockTime = lockTime;
    await PokerGame.findByIdAndUpdate(gameId, { lockTime });
  }

  // Log if only AI player remains
  if (humanCount === 0) {
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

  // Reset dealer button to the remaining player's position (0)
  // This ensures the AI player has the dealer button when all humans leave
  game.dealerButtonPosition = 0;

  // Clear remaining player's hand and reset deck
  const remainingPlayer = game.players[0];
  remainingPlayer.hand = [];
  game.deck = initializeDeck();

  // Reset AI player's chip count to default if they're the only player left
  if (remainingPlayer.isAI) {
    remainingPlayer.chipCount = POKER_GAME_CONFIG.DEFAULT_STARTING_CHIPS;

    // Update the AI player's balance in the database
    await PokerBalance.findOneAndUpdate(
      { userId: remainingPlayer.id },
      { chipCount: POKER_GAME_CONFIG.DEFAULT_STARTING_CHIPS },
      { upsert: true }
    );
  }

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
  game.markModified('dealerButtonPosition');

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
    const { leavingPlayer, wasCurrentPlayer, leavingPlayerIndex, wasDealer } = removePlayerFromGame(game, user.id);
    await game.save();

    // STEP 2: Manage lock timer based on player count
    await manageLockTimerAfterRemoval(game, gameId);

    // STEP 3: Adjust current player index if needed
    adjustCurrentPlayerIndex(game, wasCurrentPlayer, leavingPlayerIndex);

    // STEP 4: Adjust dealer button position if needed
    adjustDealerButtonPosition(game, leavingPlayerIndex, wasDealer);

    // STEP 5: Reset game state if only one player remains
    if (game.players.length === 1) {
      await resetGameForSinglePlayer(game, gameId);
    }

    // STEP 6: Log action history
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

  // Skip if duplicate detected
  if (recentBetActions.length > 0) {
    console.warn(`[PlaceBet] SKIPPING notification - duplicate detected within last second`);
    return false;
  }

  // Log action
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

  // Cancel server-side setTimeout
  const { activeTimers } = await import('../timers/poker-timer-controller');
  const existingTimer = activeTimers.get(gameId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    activeTimers.delete(gameId);
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

  setTimeout(async () => {
    const { handleReadyForNextTurn } = await import('../turn/turn-handler');
    try {
      await handleReadyForNextTurn(gameId);
    } catch (error: any) {
      // Version errors are expected during concurrent operations - log as info, not error
      if (error.name === 'VersionError' || error.message?.includes('version')) {
      } else {
        console.error('[PlaceBet] Turn advancement error:', error);
      }
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


  // Wait for fold notification to complete before emitting winner
  if (foldingPlayer.isAI || timerTriggered) {
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

  // Cancel server-side setTimeout
  const { activeTimers } = await import('../timers/poker-timer-controller');
  const existingTimer = activeTimers.get(gameId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    activeTimers.delete(gameId);
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

  setTimeout(async () => {
    const { handleReadyForNextTurn } = await import('../turn/turn-handler');
    try {
      await handleReadyForNextTurn(gameId);
    } catch (error: any) {
      // Version errors are expected during concurrent operations - log as info, not error
      if (error.name === 'VersionError' || error.message?.includes('version')) {
      } else {
        console.error('[Fold] Turn advancement error:', error);
      }
    }
  }, POKER_TIMERS.PLAYER_ACTION_NOTIFICATION_DURATION_MS);
}

/**
 * Finalize fold action when game ends: log history, clear timer, save game
 * NOTE: Reset is now triggered by client after winner notification completes.
 * This ensures communal cards remain visible during the winner notification.
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

  // Cancel the server-side setTimeout if it exists
  const { activeTimers } = await import('../timers/poker-timer-controller');
  const existingTimer = activeTimers.get(gameId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    activeTimers.delete(gameId);
  }

  // Advance to End stage
  game.stage = GameStage.End;
  game.markModified('stage');

  // Release lock before save to prevent lock timeout issues
  game.processing = false;
  await game.save();

  // Emit full game state update to show winner with timer already cleared
  // The client will display the winner notification and then signal the server
  // via poker:winner_notification_complete to trigger the game reset
  await PokerSocketEmitter.emitStateUpdate(game.toObject());

  // NOTE: Game reset is now triggered by client after winner notification completes
  // This prevents premature clearing of communal cards and duplicate game_starting notifications
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


      // STEP 3: Check how many active players remain
      const activePlayers = getActivePlayers(game.players);

      if (activePlayers.length === 1) {
        // Only one player left - they win by fold
        const winner = activePlayers[0];

        // Process fold and determine winner
        const winnerInfo = processFoldAndDetermineWinner(game, winner, foldingPlayer);

        // Emit fold and winner notifications with proper timing
        await emitFoldNotifications(playerId, foldingPlayer, winner, winnerInfo, timerTriggered);

        // Finalize fold action and trigger restart flow
        await finalizeFoldAndTriggerRestart(game, gameId, playerId, foldingPlayer, winner, winnerInfo);
      } else {
        // Multiple active players remain - game continues

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
