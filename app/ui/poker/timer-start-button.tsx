// app/ui/poker/timer-start-button.tsx

'use client';

import { memo, useState } from 'react';
import { useGameState, usePokerActions } from '@/app/lib/providers/poker-provider';
import { Button } from '../button';

function TimerStartButton() {
  const { locked, actionTimer } = useGameState();
  const { startTimer } = usePokerActions();
  const [isStarting, setIsStarting] = useState(false);

  // Temporarily hidden
  return null;

  // Only show button when:
  // - Game is locked (in progress)
  // - No active timer (undefined or paused)
  const showButton = locked && (!actionTimer || actionTimer?.isPaused);

  const handleStartTimer = async () => {
    setIsStarting(true);
    try {
      await startTimer();
    } catch (error) {
      console.error('Failed to start timer:', error);
    } finally {
      setIsStarting(false);
    }
  };

  if (!showButton) {
    return null;
  }

  return (
    <div className="flex items-center justify-center">
      <Button
        id="startTimerButton"
        onClick={handleStartTimer}
        disabled={isStarting}
        className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2"
      >
        {isStarting ? 'Starting...' : 'Start Timer'}
      </Button>
    </div>
  );
}

export default memo(TimerStartButton);
