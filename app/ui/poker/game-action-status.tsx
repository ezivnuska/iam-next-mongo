// app/ui/poker/game-action-status.tsx

'use client';

import { memo, useCallback, useEffect, useRef } from 'react';
import Countdown from '../countdown';
import { useGameState, usePokerActions, usePlayers, useViewers } from '@/app/lib/providers/poker-provider';
import { GameActionType } from '@/app/lib/definitions/game-actions';
import WinnerDisplay from './winner-display';

function GameActionStatus() {
  const { actionTimer, stage, restartCountdown, winner } = useGameState();
  const { pauseTimer, resumeTimer } = usePokerActions();
  const { players } = usePlayers();
  const { gameId } = useViewers();

  const stageName = ['Preflop', 'Flop', 'Turn', 'River'][stage] || 'Unknown';

  // Use ref to track if we've already triggered for this timer
  const lastTriggeredTimerRef = useRef<string | null>(null);

  // Handle timer expiration - fallback if server timer doesn't fire
  const handleTimerComplete = useCallback(async () => {
    // Create a unique key for this timer to prevent duplicate triggers
    const timerKey = actionTimer ? `${actionTimer.startTime}-${actionTimer.targetPlayerId}` : null;

    // Prevent duplicate triggers for the same timer
    if (timerKey && lastTriggeredTimerRef.current === timerKey) {
      return;
    }

    // Mark this timer as triggered
    if (timerKey) {
      lastTriggeredTimerRef.current = timerKey;
    }

    try {
      console.log('[Timer Check] Executing action via client fallback, gameId:', gameId || 'null (will use session)');
      const response = await fetch('/api/poker/timer/check', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('[Timer Check] Success:', data.message);
      } else {
        const errorData = await response.json();
        console.error('[Timer Check] Failed:', errorData.error);
      }
    } catch (error) {
      console.error('[Timer Check] Error:', error);
    }
  }, [gameId, actionTimer]);

  // Show restart countdown if game has ended
  if (winner && restartCountdown !== null) {
    return (
      <div className="w-full max-w-2xl mx-auto p-4 bg-purple-50 border-2 border-purple-300 rounded-lg">
        <div className="flex flex-col items-center justify-center gap-3">
          <WinnerDisplay winner={winner} />
          <span className="text-sm text-purple-600">Restarting in {restartCountdown} seconds</span>
        </div>
      </div>
    );
  }

  // Don't show if no active timer
  if (!actionTimer) {
    return null;
  }

  const { currentActionIndex, totalActions, actionType, targetPlayerId, isPaused, startTime, duration } = actionTimer;
  const completedActions = currentActionIndex;
  const progressPercentage = (completedActions / totalActions) * 100;

  // Generate action description
  let actionDescription = 'Processing action...';
  let actionIcon = '⚡';

  if (actionType === GameActionType.DEAL_CARDS) {
    actionDescription = 'Dealing cards to players';
    actionIcon = '🃏';
  } else if (actionType === GameActionType.PLAYER_BET) {
    const player = players.find(p => p.id === targetPlayerId);
    const playerName = player?.username || 'Unknown';
    actionDescription = `Waiting for ${playerName} to bet`;
    actionIcon = '💰';
  } else if (actionType === GameActionType.ADVANCE_STAGE) {
    actionDescription = 'Advancing to next stage';
    actionIcon = '➡️';
  }

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-white border-2 border-blue-300 rounded-lg shadow-md overflow-hidden">
        {/* Header */}
        <div className="bg-blue-50 px-4 py-2 border-b border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-blue-900">Game Actions</h3>
              <p className="text-xs text-blue-600">Stage: {stageName}</p>
            </div>
            <span className="text-xs text-blue-600 font-medium">
              {isPaused ? '⏸ Paused' : '▶ Running'}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-4 py-2 bg-gray-50">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-gray-600">
              Progress: {completedActions} / {totalActions}
            </span>
            <span className="text-xs text-gray-500">
              {Math.round(progressPercentage)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>

        {/* Current Action Status */}
        <div className="px-4 py-3 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{actionIcon}</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-gray-900">
                {actionDescription}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Action {currentActionIndex + 1} of {totalActions}
              </p>
            </div>
          </div>
        </div>

        {/* Timer */}
        <div className="p-4">
          <Countdown
            label="Next action"
            startTime={startTime}
            duration={duration}
            isPaused={isPaused}
            onPauseToggle={() => {
              if (isPaused) {
                resumeTimer();
              } else {
                pauseTimer();
              }
            }}
            onComplete={handleTimerComplete}
            showControls={true}
            className="w-full"
          />
        </div>

        {/* Progress Summary */}
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-gray-600">
              {completedActions} of {totalActions} actions completed
            </p>
            <p className="text-xs text-gray-500">
              {totalActions - completedActions} remaining
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(GameActionStatus);
