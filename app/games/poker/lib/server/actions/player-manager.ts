// app/games/poker/lib/server/actions/player-manager.ts
// Player management logic: add, remove, join, leave, presence, queue

import { PokerGame, type PokerGameDocument } from '@/app/games/poker/lib/models/poker-game';
import { PokerBalance } from '@/app/games/poker/lib/models/poker-balance';
import { withRetry } from '@/app/lib/utils/retry';
import type { Player } from '@/app/games/poker/lib/definitions/poker';
import { POKER_GAME_CONFIG, POKER_RETRY_CONFIG } from '@/app/games/poker/lib/config/poker-constants';
import { PokerSocketEmitter } from '@/app/lib/utils/socket-helper';
import { initializeDeck } from '../flow/poker-dealer';
import { clearActionTimer } from '../timers/poker-timer-controller';
import {
  logPlayerJoinAction,
  logPlayerLeftAction
} from '@/app/games/poker/lib/utils/action-history-helpers';
import { getPlayerBalanceOrDefault } from './balance-manager';

/**
 * Add a player to the game
 */
export async function addPlayer(
  gameId: string,
  user: { id: string; username: string },
  options: { skipLockTimeReset?: boolean } = {}
) {
  const { isGuestId } = await import('@/app/games/poker/lib/utils/guest-utils');
  const isGuest = isGuestId(user.id);

  // Get player's chip count (handles guests, migration, and validation)
  const playerChipCount = await getPlayerBalanceOrDefault(user.id, isGuest);

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

    // Check if player already in game by ID (may have been added in a previous retry)
    const alreadyIn = game.players.some((p: Player) => p.id === user.id);
    if (alreadyIn) return game.toObject();

    // Add player to game
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
      if (!result.success) {
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
    return; // Silent no-op
  }

  const actualPlayerId = game.players[playerIndex].id;

  // Use atomic update to avoid race conditions with concurrent operations
  // This updates only the specific player's isAway field without overwriting other changes
  await PokerGame.findOneAndUpdate(
    {
      _id: gameId,
      [`players.${playerIndex}.id`]: actualPlayerId  // Ensure we're updating the right player
    },
    {
      $set: { [`players.${playerIndex}.isAway`]: isAway }
    },
    {
      runValidators: true
    }
  );

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

/**
 * Remove a player from the game
 */
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
