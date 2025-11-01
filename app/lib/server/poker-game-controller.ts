// app/lib/server/poker-game-controller.ts

import { PokerGame } from '@/app/lib/models/poker-game';
import { PokerBalance } from '@/app/lib/models/poker-balance';
import { createChips } from '@/app/lib/utils/poker';
import { areAllBetsEqual, areAllPotContributionsEqual } from '@/app/lib/utils/betting';
import { withRetry } from '@/app/lib/utils/retry';
import type { Bet, Card, Player } from '@/app/lib/definitions/poker';
import { GameStage } from '@/app/lib/definitions/poker';
import { GameActionType } from '@/app/lib/definitions/game-actions';
import { ActionHistoryType } from '@/app/lib/definitions/action-history';
import { randomBytes } from 'crypto';

// Import extracted modules
import { completeRoundAndAdvanceStage, savePlayerBalances, awardPotToWinners } from './poker/poker-game-flow';
import { dealPlayerCards, reshuffleAllCards, initializeDeck } from './poker/poker-dealer';
import { startActionTimer, clearActionTimer, pauseActionTimer, resumeActionTimer } from './poker/poker-timer-controller';
import { ensurePlayerBetsInitialized, processBetTransaction, updateGameAfterBet } from './poker/bet-processor';
import { validatePlayerExists, getActivePlayerUsernames, findOtherPlayer } from '@/app/lib/utils/player-helpers';
import { scheduleGameLock, shouldStartLockTimer } from './poker/game-lock-manager';

// Import refactored utilities
import { POKER_GAME_CONFIG, POKER_TIMERS, POKER_RETRY_CONFIG } from '@/app/lib/config/poker-constants';
import { acquireGameLock, releaseGameLock } from './poker/game-lock-utils';
import {
  logBetAction,
  logFoldAction,
  logPlayerJoinAction,
  logPlayerLeftAction,
  logGameRestartAction
} from '@/app/lib/utils/action-history-helpers';
import { placeSmallBlind, placeBigBlind } from './poker/blinds-manager';

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
  // Get or create balance ONCE before retry loop to avoid duplicate creation
  let balance = await PokerBalance.findOne({ userId: user.id });
  let playerChips = createChips(POKER_GAME_CONFIG.DEFAULT_STARTING_CHIPS);

  if (balance && balance.chips.length > 0) {
    // Use their saved balance
    playerChips = balance.chips;
  } else {
    // Create new balance record with starting chips (idempotent - won't duplicate)
    await PokerBalance.findOneAndUpdate(
      { userId: user.id },
      { $setOnInsert: { userId: user.id, chips: playerChips } },
      { upsert: true, new: true }
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
      chips: playerChips,
    });

    // Explicitly mark players array as modified for Mongoose
    game.markModified('players');

    // Start auto-lock timer when 2nd player joins
    if (shouldStartLockTimer(game.players.length, !!game.lockTime)) {
      const lockTime = new Date(Date.now() + POKER_GAME_CONFIG.AUTO_LOCK_DELAY_MS);
      game.lockTime = lockTime;
      scheduleGameLock(gameId, lockTime);
    }

    await game.save();

    return game.toObject();
  }, POKER_RETRY_CONFIG);
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

    game.players = game.players.filter((p: Player) => p.id !== user.id);

    // Cancel lock timer if player count drops below 2
    if (game.players.length < 2) {
      const { cancelGameLock } = await import('./poker/game-lock-manager');
      cancelGameLock(gameId);
    }

    // If 0 players remain, reset game state (don't delete - singleton game persists)
    if (game.players.length === 0) {
      const { resetSingletonGame } = await import('./poker/singleton-game');
      const resetGame = await resetSingletonGame(gameId);
      return resetGame.toObject();
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

      // Mark modified for Mongoose (use specific path for nested document)
      game.markModified('players.0.hand');
      game.markModified('players');
      game.markModified('deck');
    }

    // Add action history
    if (leavingPlayer) {
      logPlayerLeftAction(game, user.id, leavingPlayer.username);
    }

    await game.save();
    return game.toObject();
  }, POKER_RETRY_CONFIG);
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

        // Process the bet transaction
        const { player: updatedPlayer, chipsToAdd } = processBetTransaction(player, chipCount);

        // Update game state
        updateGameAfterBet(game, playerIndex, chipCount, updatedPlayer, chipsToAdd);
      }

      // Add action history OUTSIDE the betAlreadyProcessed check to ensure logging on retries
      // Check if this exact bet was already logged to prevent duplicates
      const recentBetActions = game.actionHistory.filter((action: any) =>
        action.actionType === ActionHistoryType.PLAYER_BET &&
        action.playerId === playerId &&
        action.stage === game.stage &&
        action.betAmount === chipCount
      );

      // Only log if this bet hasn't been logged yet for this player at this stage
      if (recentBetActions.length === 0) {
        logBetAction(game, playerId, player.username, chipCount);
      }

      // Check if betting round is complete BEFORE saving
      // IMPORTANT: Check for round completion:
      // 1. Always check after actual bets (chipCount > 0)
      // 2. After checks, only check if currentPlayerIndex is back at 0 (all players have acted)
      let roundInfo = { roundComplete: false, cardsDealt: false, gameComplete: false };

      if (chipCount > 0 || game.currentPlayerIndex === 0) {
        const activePlayers = getActivePlayerUsernames(game.players);
        const allContributionsEqual = areAllPotContributionsEqual(game.pot, activePlayers);

        if (allContributionsEqual) {
          roundInfo = await completeRoundAndAdvanceStage(game);
        }
      }

      // Save once with all changes (bet + potential stage advancement)
      // Release lock before save to prevent lock timeout issues
      game.processing = false;
      await game.save();

      // Auto-start timer for next player
      // Start timer if: 1) betting continues in same round, OR 2) new round started (cards dealt)
      const shouldStartTimer = (!roundInfo.gameComplete) &&
                               (!roundInfo.roundComplete || roundInfo.cardsDealt);

      if (shouldStartTimer) {
        const nextPlayer = game.players[game.currentPlayerIndex];
        if (nextPlayer) {
          try {
            await startActionTimer(
              gameId,
              POKER_TIMERS.ACTION_DURATION_SECONDS,
              GameActionType.PLAYER_BET,
              nextPlayer.id
            );
          } catch (timerError) {
            console.error('[PlaceBet] Failed to start timer for next player:', timerError);
            // Don't fail the bet if timer fails
          }
        }
      }

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
              players: game.players, // Include players so clients can see dealt cards
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
      game.markModified('players'); // Mark modified after awarding pot

      // Clear pot and end game
      game.pot = [];
      game.locked = false;

      // Save all players' chip balances
      await savePlayerBalances(game.players);

      // Add action history
      logFoldAction(game, playerId, foldingPlayer.username);

      // Log game ended
      game.actionHistory.push({
        id: require('crypto').randomBytes(8).toString('hex'),
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
      // Collect and reshuffle all cards using dealer module
      const deck = reshuffleAllCards(game.deck, game.communalCards, game.players);

      // Initialize players with empty hands (cards will be dealt after blind betting)
      const players = game.players.map((p: Player) => ({
        ...p,
        hand: [],
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

      // Reset action history and add GAME_STARTED event
      game.actionHistory = [];
      logGameRestartAction(game);

      game.processing = false; // Release lock before save

      await game.save();

      // Validate players have enough chips before placing blinds
      const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
      const { getBlindConfig } = await import('./poker/blinds-manager');
      const { smallBlind, bigBlind } = getBlindConfig();

      // Calculate which players will post blinds based on button position
      const buttonPosition = game.dealerButtonPosition || 0;
      const smallBlindPos = game.players.length === 2 ? buttonPosition : (buttonPosition + 1) % game.players.length;
      const bigBlindPos = (buttonPosition + 1) % game.players.length;

      const smallBlindPlayerChips = game.players[smallBlindPos]?.chips?.length || 0;
      const bigBlindPlayerChips = game.players[bigBlindPos]?.chips?.length || 0;

      if (smallBlindPlayerChips < smallBlind || bigBlindPlayerChips < bigBlind) {
        // At least one player doesn't have enough chips - can't restart
        console.error(`[Restart] Insufficient chips - SB Player ${smallBlindPos}: ${smallBlindPlayerChips}/${smallBlind}, BB Player ${bigBlindPos}: ${bigBlindPlayerChips}/${bigBlind}`);

        // Unlock game and clear players who can't afford blinds
        game.locked = false;
        game.processing = false;
        await game.save();

        throw new Error(`Cannot restart game - players do not have enough chips for blinds`);
      }

      // PLACE SMALL BLIND with notification
      const smallBlindInfo = placeSmallBlind(game);
      await game.save();

      // Emit bet placed event for small blind
      await PokerSocketEmitter.emitBetPlaced({
        playerIndex: smallBlindInfo.position,
        chipCount: smallBlindInfo.amount,
        pot: game.pot,
        playerBets: game.playerBets,
        currentPlayerIndex: game.currentPlayerIndex,
        actionHistory: game.actionHistory,
      });

      await PokerSocketEmitter.emitGameNotification({
        message: `${smallBlindInfo.player.username} posts small blind (${smallBlindInfo.amount} chip)`,
        type: 'blind',
        duration: 2000,
      });

      await new Promise(resolve => setTimeout(resolve, 2200));

      // PLACE BIG BLIND with notification
      const bigBlindInfo = placeBigBlind(game);
      await game.save();

      // Emit bet placed event for big blind
      await PokerSocketEmitter.emitBetPlaced({
        playerIndex: bigBlindInfo.position,
        chipCount: bigBlindInfo.amount,
        pot: game.pot,
        playerBets: game.playerBets,
        currentPlayerIndex: game.currentPlayerIndex,
        actionHistory: game.actionHistory,
      });

      await PokerSocketEmitter.emitGameNotification({
        message: `${bigBlindInfo.player.username} posts big blind (${bigBlindInfo.amount} chips)`,
        type: 'blind',
        duration: 2000,
      });

      await new Promise(resolve => setTimeout(resolve, 2200));

      // DEAL HOLE CARDS immediately after blinds (standard poker rules)
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

      await game.save();

      // Emit notification for dealing player cards
      await PokerSocketEmitter.emitGameNotification({
        message: 'Dealing player cards',
        type: 'deal',
        duration: 2000,
      });

      // Emit cards dealt event
      await PokerSocketEmitter.emitCardsDealt({
        stage: game.stage,
        communalCards: game.communalCards,
        deckCount: game.deck.length,
        players: game.players,
      });

      // Auto-start timer for player after big blind and cards dealt
      const currentPlayer = game.players[game.currentPlayerIndex];
      if (currentPlayer) {
        try {
          await startActionTimer(
            gameId,
            POKER_TIMERS.ACTION_DURATION_SECONDS,
            GameActionType.PLAYER_BET,
            currentPlayer.id
          );
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
export { startActionTimer, clearActionTimer, pauseActionTimer, resumeActionTimer, setTurnTimerAction } from './poker/poker-timer-controller';
