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

export async function handleReadyForNextTurn(gameId: string): Promise<void> {
  console.log('[TurnHandler] Processing ready_for_next_turn for game:', gameId);

  // Acquire game lock to prevent concurrent turn advancements
  const { acquireGameLock } = await import('../locking/game-lock-utils');
  let game;
  try {
    game = await acquireGameLock(gameId);
  } catch (error: any) {
    // If lock acquisition fails, another operation is processing the game
    console.log('[TurnHandler] Could not acquire lock - game is being processed:', error.message);
    return;
  }

  // Ignore ready signal if game is not locked (not in active play)
  if (!game.locked) {
    console.log('[TurnHandler] Game is not locked - skipping ready_for_next_turn');
    game.processing = false;
    await game.save();
    return;
  }

  // Check for early completion first (all folded except one, or all-in situation)
  const { checkEarlyCompletion, completeRequirement } = await import('../flow/step-manager');
  const { RequirementType } = await import('../flow/step-definitions');
  const earlyCompletion = await checkEarlyCompletion(gameId);

  if (earlyCompletion) {
    console.log('[TurnHandler] Early completion detected - all players folded/all-in except one');
    game.processing = false;
    await game.save();

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

  console.log('[TurnHandler] Betting round state:', {
    bettingComplete: roundState.bettingComplete,
    playersActed: roundState.playersActed.size,
    stage: game.stage
  });

  if (roundState.bettingComplete) {
    // Round is complete - wait briefly to ensure last action notification completes
    // This prevents the deal notification from overlapping with the final action notification
    console.log('[TurnHandler] Betting round complete - waiting for last notification to complete before stage advancement');

    // Release lock before signaling orchestrator (orchestrator will acquire its own locks as needed)
    game.processing = false;
    await game.save();

    // Add a small buffer delay to ensure the last action notification has fully completed
    // This gives clients time to process and display the notification before stage advances
    await new Promise(resolve => setTimeout(resolve, 500));

    // *** NEW STEP-BASED FLOW ***
    // Signal the step orchestrator that betting cycle is complete
    const { onBettingCycleComplete, onPlayerAction } = await import('../flow/step-orchestrator');
    await onBettingCycleComplete(gameId);
    console.log('[TurnHandler] Step orchestrator signaled - will handle stage advancement');
    return; // Step orchestrator handles all advancement logic now

  } else {
    // Round continues - advance to next player
    console.log('[TurnHandler] Round continues - advancing to next player');

    const previousPlayerIndex = game.currentPlayerIndex;
    const { advanceToNextPlayer } = await import('../actions/bet-processor');
    advanceToNextPlayer(game, previousPlayerIndex);

    // Release lock and save
    game.processing = false;
    try {
      await game.save();
    } catch (error: any) {
      // Ignore version errors - game might be processed by server-driven reset
      if (error.name === 'VersionError' || error.message?.includes('version')) {
        console.log('[TurnHandler] Version conflict during save - game likely being processed elsewhere, skipping');
        return;
      }
      throw error;
    }

    console.log('[TurnHandler] Advanced turn from', previousPlayerIndex, 'to', game.currentPlayerIndex);

    // Emit state update so clients know currentPlayerIndex changed
    const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
    await PokerSocketEmitter.emitStateUpdate({
      ...game.toObject(),
      currentPlayerIndex: game.currentPlayerIndex,
    });

    // Get current player (after advancement)
    const currentPlayer = game.players[game.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.isAllIn || currentPlayer.folded) {
      console.log('[TurnHandler] Current player is all-in or folded after advancement');

      // Check if we should auto-advance (all active players are all-in or only one can act)
      if (StageManager.shouldAutoAdvance(game)) {
        console.log('[TurnHandler] Auto-advance condition met - triggering betting cycle complete');
        const { onBettingCycleComplete } = await import('../flow/step-orchestrator');
        await onBettingCycleComplete(gameId);
      }
      return;
    }

    // Start timer for current player (both human and AI)
    console.log(`[TurnHandler] Starting timer for ${currentPlayer.isAI ? 'AI' : 'human'} player ${currentPlayer.username}`);
    await startActionTimer(
      gameId,
      POKER_TIMERS.ACTION_DURATION_SECONDS,
      GameActionType.PLAYER_BET,
      currentPlayer.id
    );

    // If current player is AI, trigger action immediately after timer starts
    if (currentPlayer.isAI) {
      console.log('[TurnHandler] Timer started for AI player - triggering immediate action');
      const { executeAIActionIfReady } = await import('../ai/ai-player-manager');
      executeAIActionIfReady(gameId).catch(error => {
        console.error('[TurnHandler] AI action failed:', error);
      });
    }
  }

  console.log('[TurnHandler] Successfully processed ready_for_next_turn');
}
