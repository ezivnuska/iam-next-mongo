// app/poker/lib/hooks/use-action-timer-percentage.ts

'use client';

import { useState, useEffect } from 'react';

interface ActionTimer {
  startTime: string;
  duration: number;
  targetPlayerId?: string;
  isPaused: boolean;
}

/**
 * Custom hook to calculate and track the timer percentage for action timers
 *
 * @param actionTimer - The action timer object from game state
 * @param targetPlayerId - Optional player ID to match against timer's targetPlayerId
 * @returns The current percentage (0-100) of remaining time
 *
 * @example
 * // For a specific player
 * const percentage = useActionTimerPercentage(actionTimer, player.id);
 *
 * @example
 * // For any active timer (no player filter)
 * const percentage = useActionTimerPercentage(actionTimer);
 */
export function useActionTimerPercentage(
  actionTimer: ActionTimer | undefined,
  targetPlayerId?: string
): number {
  const [timePercentage, setTimePercentage] = useState<number>(0);

  useEffect(() => {
    // Reset percentage if timer is not active or paused
    if (!actionTimer || actionTimer.isPaused) {
      setTimePercentage(0);
      return;
    }

    // If targetPlayerId is provided, only show timer for matching player
    if (targetPlayerId && actionTimer.targetPlayerId !== targetPlayerId) {
      setTimePercentage(0);
      return;
    }

    // Calculate initial percentage
    const startTime = new Date(actionTimer.startTime).getTime();
    const calculatePercentage = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, actionTimer.duration - elapsed);
      const percentage = (remaining / actionTimer.duration) * 100;
      return Math.max(0, Math.min(100, percentage));
    };

    setTimePercentage(calculatePercentage());

    // Update percentage every 100ms for smooth animation
    const TIMER_UPDATE_INTERVAL = 100; // ms
    const interval = setInterval(() => {
      const newPercentage = calculatePercentage();
      setTimePercentage(newPercentage);

      // Stop updating when time runs out
      if (newPercentage <= 0) {
        clearInterval(interval);
      }
    }, TIMER_UPDATE_INTERVAL);

    return () => clearInterval(interval);
  }, [actionTimer, targetPlayerId]);

  return timePercentage;
}
