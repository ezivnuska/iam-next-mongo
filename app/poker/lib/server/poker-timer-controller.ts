// app/lib/server/poker/poker-timer-controller.ts

import { PokerGame } from '@/app/poker/lib/models/poker-game';
import { GameActionType } from '@/app/poker/lib/definitions/game-actions';
import { validatePlayerExists } from '@/app/poker/lib/utils/player-helpers';
import { withRetry } from '@/app/lib/utils/retry';
import { POKER_RETRY_CONFIG } from '@/app/poker/lib/config/poker-constants';

// Store active timer references for cancellation
// Exported so it can be accessed directly for optimization
export const activeTimers = new Map<string, NodeJS.Timeout>();

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

  // Cancel any existing timer for this game before creating a new one
  const existingTimer = activeTimers.get(gameId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    activeTimers.delete(gameId);
  }

  // Schedule auto-execution after duration and store reference
  const timerId = setTimeout(async () => {
    try {
      await executeScheduledAction(gameId);
      activeTimers.delete(gameId); // Clean up after execution
    } catch (error) {
      console.error('[Timer] Error executing scheduled action:', error);
      activeTimers.delete(gameId); // Clean up even on error
    }
  }, duration * 1000);

  // Store timer reference for potential cancellation
  activeTimers.set(gameId, timerId);

  return updatedGame.toObject();
}

/**
 * Execute the scheduled action when timer expires
 * Internal function - handles auto-bet when timer runs out
 */
async function executeScheduledAction(gameId: string) {
  console.log('[Timer] executeScheduledAction called for game:', gameId);

  const game = await PokerGame.findById(gameId);
  if (!game || !game.actionTimer || game.actionTimer.isPaused) {
    console.log('[Timer] Skipping execution - no game, timer, or timer is paused');
    return;
  }

  const { actionType, targetPlayerId, currentActionIndex } = game.actionTimer;

  // Check if timer has actually expired (prevents double execution)
  const elapsed = Date.now() - game.actionTimer.startTime.getTime();
  const expectedDuration = game.actionTimer.duration * 1000;

  console.log('[Timer] Timer check:', { elapsed, expectedDuration, hasExpired: elapsed >= expectedDuration - 100 });

  if (elapsed < expectedDuration - 100) {
    // Timer hasn't actually expired yet, skip execution
    console.log('[Timer] Timer has not expired yet, skipping');
    return;
  }

  console.log('[Timer] Timer has expired, executing action for player:', targetPlayerId);

  if (actionType === GameActionType.PLAYER_BET && targetPlayerId) {
    try {
      const playerIndex = validatePlayerExists(game.players, targetPlayerId);

      // Calculate current bet to determine default action
      const { calculateCurrentBet } = await import('@/app/poker/lib/utils/betting-helpers');
      const currentBet = calculateCurrentBet(game.playerBets, playerIndex, game.players);

      // Default action: 'check' if no bet to call, otherwise 'call' to match the bet
      const defaultAction = currentBet === 0 ? 'check' : 'call';
      const selectedAction = game.actionTimer.selectedAction || defaultAction;
      const selectedBetAmount = game.actionTimer.selectedBetAmount;

      console.log('[Timer] Executing action:', {
        actionToExecute: selectedAction,
        defaultAction,
        selectedAction: game.actionTimer.selectedAction,
        currentBet,
        selectedBetAmount
      });

      // CRITICAL: Clear timer BEFORE executing to prevent duplicate execution
      // (both server setTimeout and client fallback might trigger)
      const actionToExecute = selectedAction;

      // Use atomic update to clear timer (avoid version conflicts)
      await PokerGame.findByIdAndUpdate(gameId, { $unset: { actionTimer: "" } });

      // Calculate bet amount based on selected action
      let betAmount: number;

      switch (actionToExecute) {
        case 'fold':
          console.log('[Timer] Executing FOLD for player:', targetPlayerId);
          // Execute fold action
          const { fold } = await import('./poker-game-controller');
          const foldResult = await fold(gameId, targetPlayerId, true); // timerTriggered = true

          // Emit granular events instead of full state update
          const { PokerSocketEmitter: EmitterFold } = await import('@/app/lib/utils/socket-helper');

          // 1. Emit player left with fold action in history
          await EmitterFold.emitPlayerLeft({
            playerId: targetPlayerId,
            players: foldResult.players,
            playerCount: foldResult.players.length,
            actionHistory: foldResult.actionHistory || [],
          });

          // 2. Emit round complete with winner info
          if (foldResult.winner) {
            await EmitterFold.emitRoundComplete({
              winner: foldResult.winner,
              players: foldResult.players,
            });
          }
          console.log('[Timer] FOLD executed successfully');
          break;

        case 'call':
          // Match the current bet (use stored amount if available, otherwise calculate)
          betAmount = selectedBetAmount !== undefined ? selectedBetAmount : currentBet;
          console.log('[Timer] Executing CALL for player:', targetPlayerId, 'with amount:', betAmount);
          const { placeBet: placeBetCall } = await import('./poker-game-controller');
          const resultCall = await placeBetCall(gameId, targetPlayerId, betAmount, true); // timerTriggered = true
          const { PokerSocketEmitter: EmitterCall } = await import('@/app/lib/utils/socket-helper');
          await EmitterCall.emitGameActionResults(resultCall.events);
          console.log('[Timer] CALL executed successfully');
          break;

        case 'check':
          // Check is equivalent to calling with 0 (no bet to match)
          betAmount = 0;
          console.log('[Timer] Executing CHECK for player:', targetPlayerId);
          const { placeBet: placeBetCheck } = await import('./poker-game-controller');
          const resultCheck = await placeBetCheck(gameId, targetPlayerId, betAmount, true); // timerTriggered = true
          const { PokerSocketEmitter: EmitterCheck } = await import('@/app/lib/utils/socket-helper');
          await EmitterCheck.emitGameActionResults(resultCheck.events);
          console.log('[Timer] CHECK executed successfully');
          break;

        case 'bet':
          // Use stored bet amount if available, otherwise default to 1 chip
          betAmount = selectedBetAmount !== undefined ? selectedBetAmount : 1;
          const { placeBet: placeBetBet } = await import('./poker-game-controller');
          const resultBet = await placeBetBet(gameId, targetPlayerId, betAmount, true); // timerTriggered = true
          const { PokerSocketEmitter: EmitterBet } = await import('@/app/lib/utils/socket-helper');
          await EmitterBet.emitGameActionResults(resultBet.events);
          break;

        case 'raise':
          // Use stored bet amount if available, otherwise default to currentBet + 1
          betAmount = selectedBetAmount !== undefined ? selectedBetAmount : (currentBet + 1);
          const { placeBet: placeBetRaise } = await import('./poker-game-controller');
          const resultRaise = await placeBetRaise(gameId, targetPlayerId, betAmount, true); // timerTriggered = true
          const { PokerSocketEmitter: EmitterRaise } = await import('@/app/lib/utils/socket-helper');
          await EmitterRaise.emitGameActionResults(resultRaise.events);
          break;

        default:
          // Use stored bet amount if available, otherwise default to 1 chip
          betAmount = selectedBetAmount !== undefined ? selectedBetAmount : 1;
          const { placeBet } = await import('./poker-game-controller');
          const result = await placeBet(gameId, targetPlayerId, betAmount, true); // timerTriggered = true
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
  // Cancel the server-side setTimeout if it exists
  const existingTimer = activeTimers.get(gameId);
  if (existingTimer) {
    clearTimeout(existingTimer);
    activeTimers.delete(gameId);
    console.log(`[Timer] Canceled server-side timer for game ${gameId}`);
  }

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

    // Cancel any existing timer before creating new one
    const existingTimer = activeTimers.get(gameId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      activeTimers.delete(gameId);
    }

    // Schedule new timeout for remaining time and store reference
    const timerId = setTimeout(async () => {
      try {
        await executeScheduledAction(gameId);
        activeTimers.delete(gameId); // Clean up after execution
      } catch (error) {
        console.error('[Timer] Error executing scheduled action after resume:', error);
        activeTimers.delete(gameId); // Clean up even on error
      }
    }, remainingSeconds * 1000);

    // Store timer reference for potential cancellation
    activeTimers.set(gameId, timerId);

    return game.toObject();
  }, POKER_RETRY_CONFIG);
}

/**
 * Set the action to be taken when timer expires
 */
export async function setTurnTimerAction(
  gameId: string,
  playerId: string,
  action: 'fold' | 'call' | 'check' | 'bet' | 'raise',
  betAmount?: number
) {
  // First verify the player exists
  const game = await PokerGame.findById(gameId);
  if (!game) throw new Error('Game not found');
  validatePlayerExists(game.players, playerId);

  // Prepare update object
  const updateObj: any = {
    'actionTimer.selectedAction': action
  };

  // If bet amount is provided, store it
  if (betAmount !== undefined) {
    updateObj['actionTimer.selectedBetAmount'] = betAmount;
  }

  // Use atomic update to avoid version conflicts
  const updatedGame = await PokerGame.findOneAndUpdate(
    {
      _id: gameId,
      actionTimer: { $exists: true }
    },
    {
      $set: updateObj
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
