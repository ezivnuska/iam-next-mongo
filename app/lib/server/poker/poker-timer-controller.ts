// app/lib/server/poker/poker-timer-controller.ts

import { PokerGame } from '@/app/lib/models/poker-game';
import { GameActionType } from '@/app/lib/definitions/game-actions';
import { validatePlayerExists } from '@/app/lib/utils/player-helpers';
import { withRetry } from '@/app/lib/utils/retry';
import { POKER_RETRY_CONFIG } from '@/app/lib/config/poker-constants';

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

  const startTime = new Date();

  // Use atomic update to avoid version conflicts
  const updatedGame = await PokerGame.findByIdAndUpdate(
    gameId,
    {
      $set: {
        actionTimer: {
          startTime,
          duration,
          currentActionIndex,
          totalActions,
          actionType,
          targetPlayerId,
          isPaused: false,
        }
      }
    },
    {
      new: true,
      runValidators: true
    }
  );

  if (!updatedGame) throw new Error('Failed to start timer');

  // Emit timer started event to all clients
  const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
  await PokerSocketEmitter.emitTimerStarted({
    startTime: startTime.toISOString(),
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

  return updatedGame.toObject();
}

/**
 * Execute the scheduled action when timer expires
 * Internal function - handles auto-bet when timer runs out
 */
async function executeScheduledAction(gameId: string) {
  const game = await PokerGame.findById(gameId);
  if (!game || !game.actionTimer || game.actionTimer.isPaused) {
    return;
  }

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
      const playerIndex = validatePlayerExists(game.players, targetPlayerId);
      const selectedAction = game.actionTimer.selectedAction || 'bet';

      // CRITICAL: Clear timer BEFORE executing to prevent duplicate execution
      // (both server setTimeout and client fallback might trigger)
      const actionToExecute = selectedAction;

      // Use atomic update to clear timer (avoid version conflicts)
      await PokerGame.findByIdAndUpdate(gameId, { $unset: { actionTimer: "" } });

      // Calculate bet amount based on selected action
      let betAmount: number;
      const { calculateCurrentBet } = await import('@/app/lib/utils/betting-helpers');
      const currentBet = calculateCurrentBet(game.playerBets, playerIndex);

      switch (actionToExecute) {
        case 'fold':
          // Execute fold action
          const { fold } = await import('../poker-game-controller');
          const foldResult = await fold(gameId, targetPlayerId);
          // Emit state update to notify all clients
          const { PokerSocketEmitter: EmitterFold } = await import('@/app/lib/utils/socket-helper');
          await EmitterFold.emitStateUpdate(foldResult);
          break;

        case 'call':
          // Match the current bet
          betAmount = currentBet;
          const { placeBet: placeBetCall } = await import('../poker-game-controller');
          const resultCall = await placeBetCall(gameId, targetPlayerId, betAmount);
          const { PokerSocketEmitter: EmitterCall } = await import('@/app/lib/utils/socket-helper');
          await EmitterCall.emitGameActionResults(resultCall.events);
          break;

        case 'check':
          // Check is equivalent to calling with 0 (no bet to match)
          betAmount = 0;
          const { placeBet: placeBetCheck } = await import('../poker-game-controller');
          const resultCheck = await placeBetCheck(gameId, targetPlayerId, betAmount);
          const { PokerSocketEmitter: EmitterCheck } = await import('@/app/lib/utils/socket-helper');
          await EmitterCheck.emitGameActionResults(resultCheck.events);
          break;

        case 'bet':
          // Bet minimum amount (1 chip)
          betAmount = 1;
          const { placeBet: placeBetBet } = await import('../poker-game-controller');
          const resultBet = await placeBetBet(gameId, targetPlayerId, betAmount);
          const { PokerSocketEmitter: EmitterBet } = await import('@/app/lib/utils/socket-helper');
          await EmitterBet.emitGameActionResults(resultBet.events);
          break;

        case 'raise':
          // Call and raise by 1 chip
          betAmount = currentBet + 1;
          const { placeBet: placeBetRaise } = await import('../poker-game-controller');
          const resultRaise = await placeBetRaise(gameId, targetPlayerId, betAmount);
          const { PokerSocketEmitter: EmitterRaise } = await import('@/app/lib/utils/socket-helper');
          await EmitterRaise.emitGameActionResults(resultRaise.events);
          break;

        default:
          // Default to bet 1 chip
          betAmount = 1;
          const { placeBet } = await import('../poker-game-controller');
          const result = await placeBet(gameId, targetPlayerId, betAmount);
          const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
          await PokerSocketEmitter.emitGameActionResults(result.events);
      }

      // Note: placeBet() already handles starting the next timer internally
    } catch (betError: any) {
      console.error('[Poker] Failed to execute auto-action:', betError.message);
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
  // Use atomic update to avoid version conflicts
  const updatedGame = await PokerGame.findByIdAndUpdate(
    gameId,
    { $unset: { actionTimer: "" } },
    { new: true }
  );

  if (!updatedGame) throw new Error('Game not found');

  // Emit timer cleared event
  const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
  await PokerSocketEmitter.emitTimerCleared();

  return updatedGame.toObject();
}

/**
 * Pause the action timer
 */
export async function pauseActionTimer(gameId: string) {
  return withRetry(async () => {
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
  }, POKER_RETRY_CONFIG);
}

/**
 * Resume the action timer
 */
export async function resumeActionTimer(gameId: string) {
  return withRetry(async () => {
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
  }, POKER_RETRY_CONFIG);
}

/**
 * Set the action to be taken when timer expires
 */
export async function setTurnTimerAction(
  gameId: string,
  playerId: string,
  action: 'fold' | 'call' | 'check' | 'bet' | 'raise'
) {
  // First verify the player exists
  const game = await PokerGame.findById(gameId);
  if (!game) throw new Error('Game not found');
  validatePlayerExists(game.players, playerId);

  // Use atomic update to avoid version conflicts
  const updatedGame = await PokerGame.findOneAndUpdate(
    {
      _id: gameId,
      actionTimer: { $exists: true }
    },
    {
      $set: { 'actionTimer.selectedAction': action }
    },
    {
      new: true,
      runValidators: true
    }
  );

  if (!updatedGame) {
    // Timer might have been cleared or doesn't exist
    return game.toObject();
  }

  // Emit event to notify all clients
  const { PokerSocketEmitter } = await import('@/app/lib/utils/socket-helper');
  await PokerSocketEmitter.emitTimerActionSet({
    playerId,
    action,
  });

  return updatedGame.toObject();
}
