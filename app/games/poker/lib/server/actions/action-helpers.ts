// app/games/poker/lib/server/actions/action-helpers.ts
// Shared action finalization logic for player actions (bet, fold, etc.)

import { POKER_TIMERS } from '@/app/games/poker/lib/config/poker-constants';
import { PokerSocketEmitter } from '@/app/lib/utils/socket-helper';

/**
 * Clear action timer from game object and cancel server-side setTimeout
 */
export async function clearGameTimer(game: any, gameId: string): Promise<void> {
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
}

/**
 * Finalize player action: clear timer, save game, emit state update
 * Used by bet and fold handlers when game continues (not ending)
 */
export async function finalizeActionAndContinue(
  game: any,
  gameId: string,
  playerId: string,
  actionType: 'bet' | 'fold'
): Promise<void> {
  // Clear timer
  await clearGameTimer(game, gameId);

  // Release lock and save
  game.processing = false;
  await game.save();

  // Emit state update
  await PokerSocketEmitter.emitStateUpdate(game.toObject());

  // Signal step orchestrator
  const { onPlayerAction } = await import('../flow/step-orchestrator');
  await onPlayerAction(gameId, playerId, actionType);

  // Schedule turn advancement after notification completes
  setTimeout(async () => {
    const { handleReadyForNextTurn } = await import('../turn/turn-handler');
    try {
      await handleReadyForNextTurn(gameId);
    } catch (error: any) {
      // Version errors are expected during concurrent operations - log as info, not error
      if (error.name === 'VersionError' || error.message?.includes('version')) {
        // Silent - expected during concurrent operations
      } else {
        console.error(`[${actionType.toUpperCase()}] Turn advancement error:`, error);
      }
    }
  }, POKER_TIMERS.PLAYER_ACTION_NOTIFICATION_DURATION_MS);
}

/**
 * Finalize action when game ends: save balances, clear timer, save game
 * Used by fold handler when a winner is determined
 */
export async function finalizeActionAndEndGame(
  game: any,
  gameId: string
): Promise<void> {
  // Save all players' chip balances
  const { savePlayerBalances } = await import('../flow/poker-game-flow');
  await savePlayerBalances(game.players);

  // Clear timer
  await clearGameTimer(game, gameId);

  // Release lock before save to prevent lock timeout issues
  game.processing = false;
  await game.save();

  // Emit full game state update
  await PokerSocketEmitter.emitStateUpdate(game.toObject());
}
