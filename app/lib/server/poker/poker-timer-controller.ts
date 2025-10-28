// app/lib/server/poker/poker-timer-controller.ts

import { PokerGame } from '@/app/lib/models/poker-game';
import { GameActionType } from '@/app/lib/definitions/game-actions';
import { validatePlayerExists } from '@/app/lib/utils/player-helpers';

/**
 * Start an action timer for the game
 * Timer state is stored in DB with timestamp, clients calculate countdown locally
 */
export async function startActionTimer(
  gameId: string,
  duration: number = 10,
  actionType: GameActionType,
  targetPlayerId?: string
) {
  const game = await PokerGame.findById(gameId);
  if (!game) throw new Error('Game not found');

  // Calculate total actions (1 for deal + number of players for bets)
  const totalActions = 1 + game.players.length;
  const currentActionIndex = game.actionTimer?.currentActionIndex ?? 0;

  // Set timer state with current timestamp
  game.actionTimer = {
    startTime: new Date(),
    duration,
    currentActionIndex,
    totalActions,
    actionType,
    targetPlayerId,
    isPaused: false,
  };

  await game.save();

  // Emit timer started event to all clients
  const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
  await PokerSocketEmitter.emitTimerStarted({
    startTime: game.actionTimer.startTime.toISOString(),
    duration,
    currentActionIndex,
    totalActions,
    actionType,
    targetPlayerId,
  });

  // Schedule auto-execution after duration
  setTimeout(async () => {
    try {
      await executeScheduledAction(gameId);
    } catch (error) {
      console.error('[Timer] Error executing scheduled action:', error);
    }
  }, duration * 1000);

  return game.toObject();
}

/**
 * Execute the scheduled action when timer expires
 * Internal function - handles auto-bet when timer runs out
 */
async function executeScheduledAction(gameId: string) {
  const game = await PokerGame.findById(gameId);
  if (!game || !game.actionTimer || game.actionTimer.isPaused) return;

  const { actionType, targetPlayerId, currentActionIndex } = game.actionTimer;

  // Check if timer has actually expired (prevents double execution)
  const elapsed = Date.now() - game.actionTimer.startTime.getTime();
  const expectedDuration = game.actionTimer.duration * 1000;

  if (elapsed < expectedDuration - 100) {
    // Timer hasn't actually expired yet, skip execution
    return;
  }

  if (actionType === GameActionType.PLAYER_BET && targetPlayerId) {
    try {
      // Auto-bet always bets 1 chip (simplified logic)
      const playerIndex = validatePlayerExists(game.players, targetPlayerId);

      // CRITICAL: Clear timer BEFORE executing to prevent duplicate execution
      // (both server setTimeout and client fallback might trigger)
      game.actionTimer = undefined;
      await game.save();

      const autoBetAmount = 1; // Always 1 chip

      // Import placeBet from main controller to avoid circular dependency issues
      const { placeBet } = await import('../poker-game-controller');
      const result = await placeBet(gameId, targetPlayerId, autoBetAmount);

      // Emit socket events to notify all clients of the state change
      const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
      await PokerSocketEmitter.emitGameActionResults(result.events);

      // Note: placeBet() already handles starting the next timer internally
    } catch (betError: any) {
      console.error('[Poker] Failed to execute auto-bet:', betError.message);
      // Timer will not retry - the error has been logged
      // Client-side fallback timer check may catch this
    }
  } else if (actionType === 'DEAL_CARDS') {
    // Cards are dealt automatically by betting round completion
  }
}

/**
 * Clear the action timer
 */
export async function clearActionTimer(gameId: string) {
  const game = await PokerGame.findById(gameId);
  if (!game) throw new Error('Game not found');

  game.actionTimer = undefined;
  await game.save();

  // Emit timer cleared event
  const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
  await PokerSocketEmitter.emitTimerCleared();

  return game.toObject();
}

/**
 * Pause the action timer
 */
export async function pauseActionTimer(gameId: string) {
  const game = await PokerGame.findById(gameId);
  if (!game || !game.actionTimer) throw new Error('No active timer');

  const elapsed = (Date.now() - game.actionTimer.startTime.getTime()) / 1000;
  const remainingSeconds = Math.max(0, game.actionTimer.duration - elapsed);

  game.actionTimer.isPaused = true;
  await game.save();

  // Emit timer paused event
  const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
  await PokerSocketEmitter.emitTimerPaused({
    pausedAt: new Date().toISOString(),
    remainingSeconds,
  });

  return game.toObject();
}

/**
 * Resume the action timer
 */
export async function resumeActionTimer(gameId: string) {
  const game = await PokerGame.findById(gameId);
  if (!game || !game.actionTimer || !game.actionTimer.isPaused) {
    throw new Error('No paused timer');
  }

  const elapsed = (Date.now() - game.actionTimer.startTime.getTime()) / 1000;
  const remainingSeconds = Math.max(0, game.actionTimer.duration - elapsed);

  // Reset timer with remaining time
  game.actionTimer.startTime = new Date();
  game.actionTimer.duration = remainingSeconds;
  game.actionTimer.isPaused = false;
  await game.save();

  // Emit timer resumed event
  const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
  await PokerSocketEmitter.emitTimerResumed({
    resumedAt: game.actionTimer.startTime.toISOString(),
    duration: remainingSeconds,
    currentActionIndex: game.actionTimer.currentActionIndex,
    totalActions: game.actionTimer.totalActions,
    actionType: game.actionTimer.actionType,
    targetPlayerId: game.actionTimer.targetPlayerId,
  });

  // Schedule new timeout for remaining time
  setTimeout(async () => {
    try {
      await executeScheduledAction(gameId);
    } catch (error) {
      console.error('[Timer] Error executing scheduled action after resume:', error);
    }
  }, remainingSeconds * 1000);

  return game.toObject();
}
