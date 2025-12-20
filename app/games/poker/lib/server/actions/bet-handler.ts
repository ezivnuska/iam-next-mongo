// app/games/poker/lib/server/actions/bet-handler.ts
// Complete bet action flow

import type { Player } from '@/app/games/poker/lib/definitions/poker';
import { ActionHistoryType } from '@/app/games/poker/lib/definitions/action-history';
import { POKER_TIMERS, POKER_RETRY_CONFIG } from '@/app/games/poker/lib/config/poker-constants';
import { PokerSocketEmitter } from '@/app/lib/utils/socket-helper';
import { withRetry } from '@/app/lib/utils/retry';
import { validatePlayerExists } from '@/app/games/poker/lib/utils/player-helpers';
import { getPlayerChipCount } from '@/app/games/poker/lib/utils/side-pot-calculator';
import { ensurePlayerBetsInitialized, processBetTransaction, updateGameAfterBet } from './bet-processor';
import { logBetAction } from '@/app/games/poker/lib/utils/action-history-helpers';
import { acquireGameLock, releaseGameLock } from '../locking/game-lock-utils';
import { TurnManager } from '../turn/turn-manager';
import { finalizeActionAndContinue } from './action-helpers';

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
  const { calculateCurrentBet } = await import('@/app/games/poker/lib/utils/betting-helpers');
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
  const { calculateCurrentBet } = await import('@/app/games/poker/lib/utils/betting-helpers');
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
 * Place a bet action
 */
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
          // Log all-in for debugging
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
      await finalizeActionAndContinue(game, gameId, playerId, 'bet');

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
