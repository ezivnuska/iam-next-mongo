// app/poker/lib/server/turn-handler.ts
/**
 * Handles the ready_for_next_turn signal from client.
 * Called when client has finished displaying notifications and is ready for the next player's turn.
 * Starts the action timer for the current player.
 */

import { PokerGame } from '../../models/poker-game';
import { startActionTimer } from '../timers/poker-timer-controller';
import { POKER_TIMERS } from '../../config/poker-constants';
import { GameActionType } from '../../definitions/game-actions';
import { GameStage } from '../../definitions/poker';
import { saveGameSafe } from '../locking/game-lock-utils';

export async function handleReadyForNextTurn(gameId: string): Promise<void> {

  // Acquire game lock to prevent concurrent turn advancements
  const { acquireGameLock } = await import('../locking/game-lock-utils');
  let game;
  try {
    game = await acquireGameLock(gameId);
  } catch (error: any) {
    // If lock acquisition fails, another operation is processing the game
    return;
  }

  // Ignore ready signal if game is not locked (not in active play)
  if (!game.locked) {
    game.processing = false;
    const saved = await saveGameSafe(game, 'game not locked');
    if (!saved) return;
    return;
  }

  // Check for early completion first (all folded except one, or all-in situation)
  const { checkEarlyCompletion, completeRequirement } = await import('../flow/step-manager');
  const { RequirementType } = await import('../flow/step-definitions');
  const earlyCompletion = await checkEarlyCompletion(gameId);

  if (earlyCompletion) {
    game.processing = false;
    const saved = await saveGameSafe(game, 'early completion');
    if (!saved) return;

    // Signal step orchestrator to skip to winner
    await completeRequirement(gameId, RequirementType.ALL_PLAYERS_ACTED);
    const { onBettingCycleComplete } = await import('../flow/step-orchestrator');
    await onBettingCycleComplete(gameId);
    return;
  }

  // Check if betting round is complete
  const { TurnManager } = await import('./turn-manager');
  const { StageManager } = await import('../flow/stage-manager');
  const roundState = TurnManager.getBettingRoundState(game);

  if (roundState.bettingComplete) {
    // Round is complete - wait briefly to ensure last action notification completes
    // This prevents the deal notification from overlapping with the final action notification

    // Release lock before signaling orchestrator (orchestrator will acquire its own locks as needed)
    game.processing = false;
    const saved = await saveGameSafe(game, 'betting complete');
    if (!saved) return;

    // Add a small buffer delay to ensure the last action notification has fully completed
    // This gives clients time to process and display the notification before stage advances
    await new Promise(resolve => setTimeout(resolve, 500));

    // *** NEW STEP-BASED FLOW ***
    // Signal the step orchestrator that betting cycle is complete
    const { onBettingCycleComplete, onPlayerAction } = await import('../flow/step-orchestrator');
    await onBettingCycleComplete(gameId);
    return; // Step orchestrator handles all advancement logic now

  } else {
    // Round continues - advance to next player

    const previousPlayerIndex = game.currentPlayerIndex;
    const { advanceToNextPlayer } = await import('../actions/bet-processor');
    advanceToNextPlayer(game, previousPlayerIndex);

    // Release lock and save
    game.processing = false;
    const saved = await saveGameSafe(game, 'turn advancement');
    if (!saved) return;


    // Emit state update so clients know currentPlayerIndex changed
    const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
    await PokerSocketEmitter.emitStateUpdate({
      ...game.toObject(),
      currentPlayerIndex: game.currentPlayerIndex,
    });

    // Get current player (after advancement)
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.isAllIn || currentPlayer.folded) {

      // Check if we should auto-advance (all active players are all-in or only one can act)
      if (StageManager.shouldAutoAdvance(game)) {
        const { onBettingCycleComplete } = await import('../flow/step-orchestrator');
        await onBettingCycleComplete(gameId);
      }
      return;
    }

    // Start timer for current player (both human and AI)
    await startActionTimer(
      gameId,
      POKER_TIMERS.ACTION_DURATION_SECONDS,
      GameActionType.PLAYER_BET,
      currentPlayer.id
    );

    // If current player is AI, trigger action immediately after timer starts
    if (currentPlayer.isAI) {
      const { executeAIActionIfReady } = await import('../ai/ai-player-manager');
      executeAIActionIfReady(gameId).catch(error => {
        console.error('[TurnHandler] AI action failed:', error);
      });
    }
  }

}
