// app/games/poker/lib/server/actions/fold-handler.ts
// Complete fold action flow

import type { Player } from '@/app/games/poker/lib/definitions/poker';
import { GameStage } from '@/app/games/poker/lib/definitions/poker';
import { ActionHistoryType } from '@/app/games/poker/lib/definitions/action-history';
import { POKER_TIMERS, POKER_RETRY_CONFIG } from '@/app/games/poker/lib/config/poker-constants';
import { PokerSocketEmitter } from '@/app/lib/utils/socket-helper';
import { withRetry } from '@/app/lib/utils/retry';
import { validatePlayerExists, getActivePlayers } from '@/app/games/poker/lib/utils/player-helpers';
import { awardPotToWinners } from '../flow/poker-game-flow';
import { logFoldAction } from '@/app/games/poker/lib/utils/action-history-helpers';
import { acquireGameLock, releaseGameLock } from '../locking/game-lock-utils';
import { finalizeActionAndContinue, finalizeActionAndEndGame } from './action-helpers';
import { randomBytes } from 'crypto';

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
  // Use shared helper to save balances and clear timer
  await finalizeActionAndEndGame(game, gameId);

  // Add action history
  logFoldAction(game, playerId, foldingPlayer.username);

  // Log game ended in action history (for UI display only, not notifications)
  game.actionHistory.push({
    id: randomBytes(8).toString('hex'),
    timestamp: new Date(),
    stage: game.stage,
    actionType: ActionHistoryType.GAME_ENDED,
    winnerId: winner.id,
    winnerName: winner.username,
    handRank: winnerInfo.handRank,
  });
  game.markModified('actionHistory');

  // Advance to End stage
  game.stage = GameStage.End;
  game.markModified('stage');

  // Save with processing flag already released by finalizeActionAndEndGame
  await game.save();

  // Emit full game state update
  await PokerSocketEmitter.emitStateUpdate(game.toObject());

  // NOTE: Game reset is now triggered by client after winner notification completes
  // This prevents premature clearing of communal cards and duplicate game_starting notifications
}

/**
 * Fold action handler
 */
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

        // Log fold action
        logFoldAction(game, playerId, foldingPlayer.username);

        // Finalize and continue the game (advance to next player)
        await finalizeActionAndContinue(game, gameId, playerId, 'fold');
      }

      return game.toObject();
    } catch (error) {
      // Release lock on error
      await releaseGameLock(gameId);
      throw error;
    }
  }, POKER_RETRY_CONFIG);
}
