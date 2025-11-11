// app/poker/lib/server/turn-handler.ts
/**
 * Handles the ready_for_next_turn signal from client.
 * Called when client has finished displaying notifications and is ready for the next player's turn.
 * Starts the action timer for the current player.
 */

import { PokerGame } from '../models/poker-game';
import { startActionTimer } from './poker-timer-controller';
import { POKER_TIMERS } from '../config/poker-constants';
import { GameActionType } from '../definitions/game-actions';
import { GameStage } from '../definitions/poker';

export async function handleReadyForNextTurn(gameId: string): Promise<void> {
  console.log('[TurnHandler] Processing ready_for_next_turn for game:', gameId);

  // Fetch the game
  const game = await PokerGame.findById(gameId);
  if (!game) {
    console.error('[TurnHandler] Game not found:', gameId);
    throw new Error('Game not found');
  }

  // Check if betting round is complete
  const { TurnManager } = await import('./turn-manager');
  const { StageManager } = await import('./stage-manager');
  const roundState = TurnManager.getBettingRoundState(game);

  console.log('[TurnHandler] Betting round state:', {
    bettingComplete: roundState.bettingComplete,
    playersActed: roundState.playersActed.size,
    stage: game.stage
  });

  if (roundState.bettingComplete) {
    // Round is complete - advance stage or end game
    console.log('[TurnHandler] Betting round complete - determining next action');

    StageManager.completeStage(game);
    const nextAction = StageManager.getNextAction(game);
    console.log('[TurnHandler] Next action:', nextAction);

    if (nextAction === 'end-game') {
      // At River - determine winner
      await StageManager.endGame(game);
      await game.save();

      const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
      await PokerSocketEmitter.emitStateUpdate(game.toObject());

    } else if (nextAction === 'auto-advance') {
      // All players all-in - start auto-advance sequence
      // This will automatically advance through all stages, emit updates, and determine winner
      console.log('[TurnHandler] Starting auto-advance sequence (all players all-in)');
      await StageManager.startAutoAdvanceSequence(game);

    } else if (nextAction === 'advance') {
      // Advance to next stage (Flop/Turn/River/Showdown)
      const previousStage = game.stage;
      await StageManager.advanceToNextStage(game);
      await game.save();

      const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
      await PokerSocketEmitter.emitStateUpdate(game.toObject());

      // Check if we just advanced to Showdown (from River)
      // Showdown has no betting, so immediately end the game
      if (previousStage === GameStage.River && game.stage === GameStage.Showdown) {
        console.log('[TurnHandler] Advanced to Showdown - ending game immediately');
        await StageManager.endGame(game);
        await game.save();
        await PokerSocketEmitter.emitStateUpdate(game.toObject());
        return;
      }

      // Stage advanced - start timer for first player in new stage
      const currentPlayer = game.players[game.currentPlayerIndex];
      if (currentPlayer && !currentPlayer.isAllIn && !currentPlayer.folded) {
        console.log(`[TurnHandler] Starting timer for new stage - ${currentPlayer.isAI ? 'AI' : 'human'} player ${currentPlayer.username}`);
        await startActionTimer(
          gameId,
          POKER_TIMERS.ACTION_DURATION_SECONDS,
          GameActionType.PLAYER_BET,
          currentPlayer.id
        );

        // If current player is AI, trigger action
        if (currentPlayer.isAI) {
          const { executeAIActionIfReady } = await import('./ai-player-manager');
          executeAIActionIfReady(gameId).catch(error => {
            console.error('[TurnHandler] AI action failed:', error);
          });
        }
      }
    }
  } else {
    // Round continues - advance to next player
    console.log('[TurnHandler] Round continues - advancing to next player');

    const previousPlayerIndex = game.currentPlayerIndex;
    const { advanceToNextPlayer } = await import('./bet-processor');
    advanceToNextPlayer(game, previousPlayerIndex);
    await game.save();

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
      const { executeAIActionIfReady } = await import('./ai-player-manager');
      executeAIActionIfReady(gameId).catch(error => {
        console.error('[TurnHandler] AI action failed:', error);
      });
    }
  }

  console.log('[TurnHandler] Successfully processed ready_for_next_turn');
}
