// app/ui/poker/game-action-timer.tsx

'use client';

import { memo } from 'react';
import Countdown from '../countdown';
import { useGameState, usePokerActions } from '@/app/lib/providers/poker-provider';

function GameActionTimer() {
  const { actionTimer } = useGameState();
  const { pauseTimer, resumeTimer } = usePokerActions();

  // Don't show timer if no timer active
  if (!actionTimer) {
    return null;
  }

  // Generate label based on action type
  let label = 'Next action';
  if (actionTimer.actionType === 'DEAL_CARDS') {
    label = 'Dealing cards';
  } else if (actionTimer.actionType === 'PLAYER_BET') {
    label = 'Auto-bet';
  }

  const handlePauseToggle = () => {
    if (actionTimer.isPaused) {
      resumeTimer();
    } else {
      pauseTimer();
    }
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <Countdown
        label={label}
        startTime={actionTimer.startTime}
        duration={actionTimer.duration}
        isPaused={actionTimer.isPaused}
        onPauseToggle={handlePauseToggle}
        showControls={true}
        className="w-full max-w-md"
      />
      <div className="text-xs text-gray-500">
        Action {actionTimer.currentActionIndex + 1} of {actionTimer.totalActions}
      </div>
    </div>
  );
}

export default memo(GameActionTimer);
