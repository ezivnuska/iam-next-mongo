// app/lib/server/poker-game-controller.ts

import { PokerGame } from '@/app/lib/models/poker-game';
import { PokerBalance } from '@/app/lib/models/poker-balance';
import { createChips } from '@/app/lib/utils/poker';
import { areAllBetsEqual, areAllPotContributionsEqual } from '@/app/lib/utils/betting';
import { withRetry } from '@/app/lib/utils/retry';
import type { Bet, Card, Player } from '@/app/lib/definitions/poker';
import { GameStage } from '@/app/lib/definitions/poker';
import { GameActionType } from '@/app/lib/definitions/game-actions';
import { randomBytes } from 'crypto';

// Import extracted modules
import { completeRoundAndAdvanceStage, savePlayerBalances, awardPotToWinners } from './poker/poker-game-flow';
import { dealPlayerCards, reshuffleAllCards, initializeDeck } from './poker/poker-dealer';
import { startActionTimer, clearActionTimer, pauseActionTimer, resumeActionTimer } from './poker/poker-timer-controller';
import { ensurePlayerBetsInitialized, processBetTransaction, updateGameAfterBet } from './poker/bet-processor';
import { validatePlayerExists, getActivePlayerUsernames, findOtherPlayer } from '@/app/lib/utils/player-helpers';
import { scheduleGameLock, shouldStartLockTimer } from './poker/game-lock-manager';

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
    stage: Number(GameStage.Preflop), // Ensure it's stored as number 0
    currentPlayerIndex: 0,
    playerBets: [],
  });

  return game.toObject();
}

export async function addPlayer(
  gameId: string,
  user: { id: string; username: string }
) {
  const game = await PokerGame.findById(gameId);
  if (!game) throw new Error('Game not found');

  // Check if game is locked
  if (game.locked) {
    throw new Error('Game is locked - no new players allowed');
  }

  // Check if game is full (max 5 players)
  if (game.players.length >= 5) {
    throw new Error('Game is full - maximum 5 players allowed');
  }

  const alreadyIn = game.players.some((p: Player) => p.id === user.id);
  if (alreadyIn) return game.toObject();

  // Get user's saved chip balance or create default
  let balance = await PokerBalance.findOne({ userId: user.id });

  let playerChips = createChips(100); // Default starting chips

  if (balance && balance.chips.length > 0) {
    // Use their saved balance
    playerChips = balance.chips;
  } else {
    // Create new balance record with starting chips
    await PokerBalance.create({
      userId: user.id,
      chips: playerChips,
    });
  }

  game.players.push({
    id: user.id,
    username: user.username,
    hand: [],
    chips: playerChips,
  });

  // Explicitly mark players array as modified for Mongoose
  game.markModified('players');

  // Start auto-lock timer when 2nd player joins
  if (shouldStartLockTimer(game.players.length, !!game.lockTime)) {
    const lockTime = new Date(Date.now() + 10000); // 10 seconds from now
    game.lockTime = lockTime;
    scheduleGameLock(gameId, lockTime);
  }

  await game.save();

  return game.toObject();
}

export async function removePlayer(
  gameId: string,
  user: { id: string; username: string }
): Promise<any> {
  const game = await PokerGame.findById(gameId);
  if (!game) throw new Error('Game not found');

  const isPlayer = game.players.some((p: Player) => p.id === user.id);
  if (!isPlayer) return game.toObject();

  const leavingPlayer = game.players.find((p: Player) => p.id === user.id);
  const currentStage = game.stage;

  game.players = game.players.filter((p: Player) => p.id !== user.id);

  // If 0 players remain, reset game state (don't delete - singleton game persists)
  if (game.players.length === 0) {
    const { resetSingletonGame } = await import('./poker/singleton-game');
    const resetGame = await resetSingletonGame(gameId);
    return resetGame.toObject();
  }

  // If only 1 player remains, reset game state
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
  }

  // Add action history directly to document (avoid separate save)
  if (leavingPlayer) {
    const { randomBytes } = await import('crypto');
    const { ActionHistoryType } = await import('@/app/lib/definitions/action-history');

    game.actionHistory.push({
      id: randomBytes(8).toString('hex'),
      timestamp: new Date(),
      stage: currentStage,
      actionType: ActionHistoryType.PLAYER_LEFT,
      playerId: user.id,
      playerName: leavingPlayer.username,
    });
    game.markModified('actionHistory');
  }

  await game.save();
  return game.toObject();
}

export async function placeBet(gameId: string, playerId: string, chipCount = 1) {
  // Retry with fresh state fetch on each attempt to avoid double-betting
  // Use more retries for high-contention scenarios (concurrent bets, round completion)
  return withRetry(async () => {

    // ATOMIC LOCK ACQUISITION
    // Don't use the returned document - just check if lock was acquired
    const lockResult = await PokerGame.findOneAndUpdate(
      { _id: gameId, processing: false },
      { processing: true },
      { new: false, lean: true } // Return plain object, don't track
    );

    if (!lockResult) {
      // Either game doesn't exist OR another operation is in progress
      const existingGame = await PokerGame.findById(gameId).lean();
      if (!existingGame) {
        throw new Error('Game not found');
      }

      // Game is currently being processed by another operation
      throw new Error('Game is currently being processed');
    }

    // Small delay to ensure write propagation (eventual consistency)
    await new Promise(resolve => setTimeout(resolve, 10));

    // Fetch fresh document for processing
    const game = await PokerGame.findById(gameId);
    if (!game) throw new Error('Game not found after lock acquisition');

    try {
      // Validate player and get index
      const playerIndex = validatePlayerExists(game.players, playerId);

    // CRITICAL FIX: Check if this bet was already processed in a previous retry attempt
    // This prevents double-betting when MongoDB version conflicts trigger retries
    const currentPlayerBetAmount = game.playerBets[playerIndex] || 0;

    // Get player info before conditional (needed for logging later)
    const player = game.players[playerIndex];

    // Check if this exact bet was already processed in THIS betting round
    // We only check playerBets array (which is per-round), NOT the pot (which accumulates across rounds)
    const expectedNewBetAmount = currentPlayerBetAmount + chipCount;

    // If player's bet amount already includes this chipCount, skip processing
    const betAlreadyProcessed = currentPlayerBetAmount >= expectedNewBetAmount;

    if (!betAlreadyProcessed) {
      // Ensure player bets are initialized
      ensurePlayerBetsInitialized(game);

      // Process the bet transaction
      const { player: updatedPlayer, chipsToAdd } = processBetTransaction(player, chipCount);

      // Update game state
      updateGameAfterBet(game, playerIndex, chipCount, updatedPlayer, chipsToAdd);
    }

    // Add action history OUTSIDE the betAlreadyProcessed check to ensure logging on retries
    // Check if this exact bet was already logged to prevent duplicates
    const { randomBytes } = await import('crypto');
    const { ActionHistoryType } = await import('@/app/lib/definitions/action-history');

    const recentBetActions = game.actionHistory.filter((action: any) =>
      action.actionType === ActionHistoryType.PLAYER_BET &&
      action.playerId === playerId &&
      action.stage === game.stage &&
      action.chipAmount === chipCount
    );

    // Only log if this bet hasn't been logged yet for this player at this stage
    if (recentBetActions.length === 0) {
      game.actionHistory.push({
        id: randomBytes(8).toString('hex'),
        timestamp: new Date(),
        stage: game.stage,
        actionType: ActionHistoryType.PLAYER_BET,
        playerId,
        playerName: player.username,
        chipAmount: chipCount,
      });
      game.markModified('actionHistory');
    }

    // Check if betting round is complete BEFORE saving
    const activePlayers = getActivePlayerUsernames(game.players);

    // Calculate contributions for debugging
    const playerContributions: Record<string, number> = {};
    game.pot.forEach((bet: any) => {
      const playerName = bet.player;
      const betValue = bet.chips.reduce((sum: number, chip: any) => sum + chip.value, 0);
      playerContributions[playerName] = (playerContributions[playerName] || 0) + betValue;
    });

    const allContributionsEqual = areAllPotContributionsEqual(game.pot, activePlayers);

    let roundInfo = { roundComplete: false, cardsDealt: false, gameComplete: false };

    if (allContributionsEqual) {
      roundInfo = await completeRoundAndAdvanceStage(game);
      // Timer must be started manually via /api/poker/timer/start
      // Auto-start disabled per user request
    } else {
      // Timer must be started manually via /api/poker/timer/start
      // Auto-start disabled per user request
    }

      // Save once with all changes (bet + potential stage advancement)
      // Release lock before save to prevent lock timeout issues
      game.processing = false;
      await game.save();

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
          },
          ...(roundInfo.cardsDealt && {
            cardsDealt: {
              stage: game.stage,
              communalCards: game.communalCards,
              deckCount: game.deck.length,
            }
          }),
          ...(roundInfo.gameComplete && {
            roundComplete: {
              winner: game.winner,
              players: game.players,
            }
          }),
        }
      };
    } catch (error) {
      // Release lock on error using atomic update (bypasses version check)
      try {
        await PokerGame.findByIdAndUpdate(gameId, { processing: false });
      } catch (unlockError) {
        console.error('[PlaceBet] Failed to release lock:', unlockError);
      }
      throw error;
    }
  }, {
    maxRetries: 8,
    baseDelay: 50,
    isRetryable: (error: any) => {
      // Retry on version conflicts OR when game is being processed
      return error.message?.includes('No matching document found') ||
             error.message?.includes('version') ||
             error.name === 'VersionError' ||
             error.message?.includes('currently being processed');
    }
  }); // Increased retries with jitter for concurrent access and lock contention
}

export async function fold(gameId: string, playerId: string) {
  return withRetry(async () => {
    // ATOMIC LOCK ACQUISITION
    const lockResult = await PokerGame.findOneAndUpdate(
      { _id: gameId, processing: false },
      { processing: true },
      { new: false, lean: true }
    );

    if (!lockResult) {
      const existingGame = await PokerGame.findById(gameId).lean();
      if (!existingGame) {
        throw new Error('Game not found');
      }
      throw new Error('Game is currently being processed');
    }

    // Small delay to ensure write propagation
    await new Promise(resolve => setTimeout(resolve, 10));

    // Fetch fresh document for processing
    const game = await PokerGame.findById(gameId);
    if (!game) throw new Error('Game not found after lock acquisition');

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

      // Clear pot and end game
      game.pot = [];
      game.locked = false;

      // Save all players' chip balances
      await savePlayerBalances(game.players);

      // Add action history directly to document (avoid separate saves)
      const { randomBytes } = await import('crypto');
      const { ActionHistoryType } = await import('@/app/lib/definitions/action-history');

      game.actionHistory.push({
        id: randomBytes(8).toString('hex'),
        timestamp: new Date(),
        stage: game.stage,
        actionType: ActionHistoryType.PLAYER_FOLD,
        playerId,
        playerName: foldingPlayer.username,
      });

      game.actionHistory.push({
        id: randomBytes(8).toString('hex'),
        timestamp: new Date(),
        stage: game.stage,
        actionType: ActionHistoryType.GAME_ENDED,
        winnerId: winner.id,
        winnerName: winner.username,
      });

      game.markModified('actionHistory');

      // Release lock before save to prevent lock timeout issues
      game.processing = false;
      await game.save();

      return game.toObject();
    } catch (error) {
      // Release lock on error
      try {
        await PokerGame.findByIdAndUpdate(gameId, { processing: false });
      } catch (unlockError) {
        console.error('[Fold] Failed to release lock:', unlockError);
      }
      throw error;
    }
  }, {
    maxRetries: 8,
    baseDelay: 50,
    isRetryable: (error: any) => {
      return error.message?.includes('No matching document found') ||
             error.message?.includes('version') ||
             error.name === 'VersionError' ||
             error.message?.includes('currently being processed');
    }
  });
}

export async function restart(gameId: string) {
  return withRetry(async () => {
    // ATOMIC LOCK ACQUISITION
    const lockResult = await PokerGame.findOneAndUpdate(
      { _id: gameId, processing: false },
      { processing: true },
      { new: false, lean: true }
    );

    if (!lockResult) {
      const existingGame = await PokerGame.findById(gameId).lean();
      if (!existingGame) {
        throw new Error('Game not found');
      }
      throw new Error('Game is currently being processed');
    }

    // Small delay to ensure write propagation
    await new Promise(resolve => setTimeout(resolve, 10));

    // Fetch fresh document for processing
    const game = await PokerGame.findById(gameId);
    if (!game) throw new Error('Game not found after lock acquisition');

    try {
      // Collect and reshuffle all cards using dealer module
      const deck = reshuffleAllCards(game.deck, game.communalCards, game.players);

      // Initialize players with empty hands (cards will be dealt after blind betting)
      const players = game.players.map((p: Player) => ({
        ...p,
        hand: [],
      }));

      // Don't deal cards yet - players should do blind betting first
      // Cards will be dealt automatically after first betting round completes
      game.communalCards = [];
      game.pot = [];
      game.stage = 0; // Start at Preflop
      game.locked = true;
      game.winner = undefined;
      game.stages = [];
      game.currentPlayerIndex = 0;
      game.playerBets = new Array(game.players.length).fill(0);
      game.deck = deck;
      game.players = players as any;
      game.actionTimer = undefined; // Clear any existing timer

      // Reset action history and add GAME_STARTED event
      const { randomBytes } = await import('crypto');
      const { ActionHistoryType } = await import('@/app/lib/definitions/action-history');

      game.actionHistory = [];
      game.actionHistory.push({
        id: randomBytes(8).toString('hex'),
        timestamp: new Date(),
        stage: 0, // Preflop
        actionType: ActionHistoryType.GAME_STARTED,
      });
      game.markModified('actionHistory');

      game.processing = false; // Release lock before save

      await game.save();

      return game.toObject();
    } catch (error) {
      // Release lock on error
      try {
        await PokerGame.findByIdAndUpdate(gameId, { processing: false });
      } catch (unlockError) {
        console.error('[Restart] Failed to release lock:', unlockError);
      }
      throw error;
    }
  }, {
    maxRetries: 8,
    baseDelay: 50,
    isRetryable: (error: any) => {
      return error.message?.includes('No matching document found') ||
             error.message?.includes('version') ||
             error.name === 'VersionError' ||
             error.message?.includes('currently being processed');
    }
  });
}

export async function deleteGame(gameId: string) {
  const result = await PokerGame.findByIdAndDelete(gameId);
  if (!result) throw new Error('Game not found');
  return { success: true };
}

// Re-export timer functions for backward compatibility
export { startActionTimer, clearActionTimer, pauseActionTimer, resumeActionTimer } from './poker/poker-timer-controller';
