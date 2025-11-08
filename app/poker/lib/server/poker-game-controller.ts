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

    // Manage AI player based on human player count (do this before timer to get accurate count)
    const humanCount = game.players.filter((p: Player) => !p.isAI).length;
    const hasAI = game.players.some((p: Player) => p.isAI);

    if (humanCount >= 2 && hasAI) {
      // Remove AI if 2+ human players
      const { removeAIPlayerFromGame } = await import('./ai-player-manager');
      await removeAIPlayerFromGame(gameId);
      // Refresh game to get updated player list
      const refreshedGame = await PokerGame.findById(gameId);
      if (refreshedGame) {
        game.players = refreshedGame.players;
      }
      console.log('[AddPlayer] Removed AI - 2+ human players present');
    } else if (humanCount === 1 && !hasAI && !game.locked) {
      // Add AI if only 1 human player
      const { addAIPlayerToGame } = await import('./ai-player-manager');
      await addAIPlayerToGame(gameId);
      // Refresh game to get updated player list
      const refreshedGame = await PokerGame.findById(gameId);
      if (refreshedGame) {
        game.players = refreshedGame.players;
      }
      console.log('[AddPlayer] Added AI - only 1 human player');
    }

    // Start/reset auto-lock timer when we have 2+ total players and game not locked
    if (game.players.length >= 2 && !game.locked) {
      const lockTime = new Date(Date.now() + POKER_GAME_CONFIG.AUTO_LOCK_DELAY_MS);
      game.lockTime = lockTime;
      await PokerGame.findByIdAndUpdate(gameId, { lockTime });
      scheduleGameLock(gameId, lockTime);
      console.log(`[AddPlayer] ${humanCount === 1 ? 'Started' : 'Reset'} auto-lock timer - game will lock in ${POKER_GAME_CONFIG.AUTO_LOCK_DELAY_MS / 1000} seconds`);
    }

    // Return fresh game state
    const finalGame = await PokerGame.findById(gameId);
    return finalGame ? finalGame.toObject() : game.toObject();
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
    const wasCurrentPlayer = game.players[game.currentPlayerIndex]?.id === user.id;
    const leavingPlayerIndex = game.players.findIndex((p: Player) => p.id === user.id);

    game.players = game.players.filter((p: Player) => p.id !== user.id);

    // Save the updated player list first
    game.markModified('players');
    await game.save();

    // Manage AI player based on remaining human player count
    const humanCount = game.players.filter((p: Player) => !p.isAI).length;
    const hasAI = game.players.some((p: Player) => p.isAI);

    if (humanCount === 1 && !hasAI && !game.locked) {
      // Add AI if only 1 human player remains
      const { addAIPlayerToGame } = await import('./ai-player-manager');
      await addAIPlayerToGame(gameId);
      // Refresh game to get updated player list
      const refreshedGame = await PokerGame.findById(gameId);
      if (refreshedGame) {
        game.players = refreshedGame.players;
      }
      console.log('[RemovePlayer] Added AI - only 1 human player remains');
    }

    // Manage lock timer based on total player count (after AI management)
    if (game.players.length < 2) {
      // Cancel lock timer if player count drops below 2
      const { cancelGameLock } = await import('./game-lock-manager');
      cancelGameLock(gameId);
      game.lockTime = undefined;
      await PokerGame.findByIdAndUpdate(gameId, { lockTime: undefined });
      console.log('[RemovePlayer] Cancelled auto-lock timer - less than 2 players');
    } else if (game.players.length >= 2 && !game.locked) {
      // Reset lock timer if 2+ players remain (give them more time after someone leaves)
      const { scheduleGameLock } = await import('./game-lock-manager');
      const lockTime = new Date(Date.now() + POKER_GAME_CONFIG.AUTO_LOCK_DELAY_MS);
      game.lockTime = lockTime;
      await PokerGame.findByIdAndUpdate(gameId, { lockTime });
      scheduleGameLock(gameId, lockTime);
      console.log(`[RemovePlayer] Reset auto-lock timer - game will lock in ${POKER_GAME_CONFIG.AUTO_LOCK_DELAY_MS / 1000} seconds`);
    }

    // If 0 players remain, reset game state (don't delete - singleton game persists)
    if (game.players.length === 0) {
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
  const isPreflop = game.stage === 0;

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
      const recentBetActions = game.actionHistory.filter((action: any) =>
        action.actionType === ActionHistoryType.PLAYER_BET &&
        action.playerId === playerId &&
        action.stage === game.stage &&
        action.betAmount === chipCount
      );

      // Only log if this bet hasn't been logged yet for this player at this stage
      if (recentBetActions.length === 0) {
        logBetAction(game, playerId, player.username, chipCount);

        // Emit action notification
        const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
        const { calculateCurrentBet } = await import('@/app/poker/lib/utils/betting-helpers');

        // Calculate what the bet to call was BEFORE this action
        const betToCall = calculateCurrentBet(
          game.playerBets.map((bet: number, idx: number) => idx === playerIndex ? currentPlayerBetAmount : bet),
          playerIndex,
          game.players
        );

        // Determine action type
        let actionMessage = '';
        if (chipCount === 0) {
          actionMessage = `${player.username} checks`;
        } else if (betToCall > 0 && chipCount === betToCall) {
          actionMessage = `${player.username} calls ${chipCount}`;
        } else if (betToCall > 0 && chipCount > betToCall) {
          actionMessage = `${player.username} raises to ${chipCount}`;
        } else {
          actionMessage = `${player.username} bets ${chipCount}`;
        }

        await PokerSocketEmitter.emitGameNotification({
          message: actionMessage,
          type: 'action',
          duration: POKER_TIMERS.NOTIFICATION_DURATION_MS,
          excludeUserId: playerId, // Don't show notification to the player who performed the action
        });
      }

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
      const hasWrappedToStart = game.currentPlayerIndex === startIndex;
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
            // All players all-in - advance through all remaining stages
            console.log('[PlaceBet] Auto-advancing through remaining stages (all players all-in)');
            const autoAdvanceResult = await StageManager.autoAdvanceThroughRemainingStages(game);

            roundInfo = {
              roundComplete: true,
              cardsDealt: autoAdvanceResult.cardsDealt,
              gameComplete: autoAdvanceResult.gameComplete
            };
          } else if (nextAction === 'advance') {
            // Normal stage advancement
            console.log('[PlaceBet] Advancing to next stage (normal flow)');
            const advanced = await StageManager.advanceToNextStage(game);

            roundInfo = {
              roundComplete: true,
              cardsDealt: advanced,
              gameComplete: false
            };
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

      // Auto-start timer for next player
      // Start timer if: 1) betting continues in same round, OR 2) new round started (cards dealt)
      const shouldStartTimer = (!roundInfo.gameComplete) &&
                               (!roundInfo.roundComplete || roundInfo.cardsDealt);

      console.log('[PlaceBet] Timer decision:', {
        shouldStartTimer,
        gameComplete: roundInfo.gameComplete,
        roundComplete: roundInfo.roundComplete,
        cardsDealt: roundInfo.cardsDealt,
        currentPlayerIndex: game.currentPlayerIndex
      });

      if (shouldStartTimer) {
        const nextPlayer = game.players[game.currentPlayerIndex];
        console.log('[PlaceBet] Next player:', nextPlayer?.username, 'isAllIn:', nextPlayer?.isAllIn, 'folded:', nextPlayer?.folded);

        // Additional safety check: Don't start timer if all active players are all-in
        const playersWhoCanAct = getPlayersWhoCanAct(game.players);
        const allPlayersAllInOrFolded = playersWhoCanAct.length === 0;

        console.log('[PlaceBet] Timer safety checks:', {
          playersWhoCanAct: playersWhoCanAct.length,
          allPlayersAllInOrFolded,
          nextPlayerExists: !!nextPlayer,
          nextPlayerCanAct: nextPlayer && !nextPlayer.isAllIn && !nextPlayer.folded
        });

        // Only start timer if next player exists, is not all-in, AND there are players who can act
        if (nextPlayer && !nextPlayer.isAllIn && !nextPlayer.folded && !allPlayersAllInOrFolded) {
          console.log(`[PlaceBet] Starting timer for player ${nextPlayer.username}`);
          try {
            await startActionTimer(
              gameId,
              POKER_TIMERS.ACTION_DURATION_SECONDS,
              GameActionType.PLAYER_BET,
              nextPlayer.id
            );
            console.log(`[PlaceBet] Timer started successfully for ${nextPlayer.username}`);
          } catch (timerError) {
            console.error('[PlaceBet] Failed to start timer for next player:', timerError);
            // Don't fail the bet if timer fails
          }
        } else {
          console.log('[PlaceBet] Not starting timer - next player is all-in/folded, no players can act, or does not exist');
        }
      } else {
        console.log('[PlaceBet] Not starting timer - game complete or round complete without cards dealt');
      }

      const result = {
        game: game.toObject(),
        events: {
          betPlaced: {
            playerIndex,
            chipCount,
            pot: game.pot,
            playerBets: game.playerBets,
            currentPlayerIndex: game.currentPlayerIndex,
            actionHistory: game.actionHistory,
            players: game.players, // Include players for chip count and all-in status updates
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

      // Check if next player is AI and trigger their turn
      setImmediate(async () => {
        try {
          const { checkAndExecuteAITurn } = await import('./ai-player-manager');
          await checkAndExecuteAITurn(gameId);
        } catch (aiError) {
          console.error('[PlaceBet] Error checking AI turn:', aiError);
        }
      });

      return result;
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

      // Emit fold notification
      const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
      await PokerSocketEmitter.emitGameNotification({
        message: `${foldingPlayer.username} folds`,
        type: 'action',
        duration: 2000,
        excludeUserId: playerId, // Don't show notification to the player who folded
      });

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

      // Clear any existing timer (game ended due to fold) - do this before save/emit
      try {
        await clearActionTimer(gameId);
      } catch (timerError) {
        console.error('[Fold] Failed to clear timer:', timerError);
        // Don't fail the fold if timer clear fails
      }

      // Release lock before save to prevent lock timeout issues
      game.processing = false;
      await game.save();

      // Fetch fresh game state after timer clear to ensure timer is removed
      const freshGame = await PokerGame.findById(gameId);

      // Emit full game state update to show winner (with timer already cleared)
      await PokerSocketEmitter.emitStateUpdate(freshGame ? freshGame.toObject() : game.toObject());

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
      // Before restarting, check if we should remove AI (if 2+ human players)
      const humanPlayers = game.players.filter((p: Player) => !p.isAI);
      const hasAI = game.players.some((p: Player) => p.isAI);

      if (humanPlayers.length >= 2 && hasAI) {
        console.log('[Restart] Removing AI player - sufficient human players for next game');
        const aiIndex = game.players.findIndex((p: Player) => p.isAI);
        if (aiIndex !== -1) {
          game.players.splice(aiIndex, 1);
          game.markModified('players');
          await game.save();
          console.log(`[Restart] AI player removed before restart`);
        }
      }

      // Validate that we have enough players to restart (need at least 2)
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
        players: game.players, // Include players for all-in status updates
      });

      await PokerSocketEmitter.emitGameNotification({
        message: `${smallBlindInfo.player.username} posts small blind (${smallBlindInfo.amount} chip)`,
        type: 'blind',
        duration: 2000,
      });

      await new Promise(resolve => setTimeout(resolve, POKER_TIMERS.POST_NOTIFICATION_DELAY_MS));

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
        players: game.players, // Include players for all-in status updates
      });

      await PokerSocketEmitter.emitGameNotification({
        message: `${bigBlindInfo.player.username} posts big blind (${bigBlindInfo.amount} chips)`,
        type: 'blind',
        duration: 2000,
      });

      await new Promise(resolve => setTimeout(resolve, POKER_TIMERS.POST_NOTIFICATION_DELAY_MS));

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
export { startActionTimer, clearActionTimer, pauseActionTimer, resumeActionTimer, setTurnTimerAction } from './poker-timer-controller';
