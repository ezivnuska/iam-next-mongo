// app/lib/hooks/use-action-timer-countdown.ts

'use client';

import { useState, useEffect } from 'react';

interface ActionTimer {
  startTime: string;
  duration: number;
  isPaused: boolean;
}

/**
 * Custom hook to calculate and update countdown timer from actionTimer state
 * Eliminates duplicate timer countdown logic across components
 *
 * @param actionTimer - The action timer state from game
 * @param condition - Optional condition to enable/disable the countdown (default: true)
 * @returns Current countdown in seconds
 */
export function useActionTimerCountdown(
  actionTimer?: ActionTimer | null,
  condition: boolean = true
): number {
  const [countdown, setCountdown] = useState<number>(0);

  useEffect(() => {
    // Reset countdown if timer is not active or condition is false
    if (!actionTimer || actionTimer.isPaused || !condition) {
      setCountdown(0);
      return;
    }

    // Calculate initial countdown
    const startTime = new Date(actionTimer.startTime).getTime();
    const elapsed = (Date.now() - startTime) / 1000;
    const remaining = Math.max(0, actionTimer.duration - elapsed);
    setCountdown(Math.ceil(remaining));

    // Update countdown every 100ms for smooth display
    const interval = setInterval(() => {
      const currentElapsed = (Date.now() - startTime) / 1000;
      const currentRemaining = Math.max(0, actionTimer.duration - currentElapsed);
      setCountdown(Math.ceil(currentRemaining));

      // Clear interval if timer has expired
      if (currentRemaining <= 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [actionTimer, condition]);

  return countdown;
}
