// app/lib/hooks/use-action-timer-countdown.ts

'use client';

import { useState, useEffect, useRef } from 'react';
import type { SerializedActionTimer } from '../definitions/poker';

/**
 * Custom hook to calculate and update countdown timer from actionTimer state
 * Eliminates duplicate timer countdown logic across components
 *
 * @param actionTimer - The action timer state from game
 * @param condition - Optional condition to enable/disable the countdown (default: true)
 * @param onExpire - Optional callback to invoke when timer expires
 * @returns Current countdown in seconds
 */
export function useActionTimerCountdown(
  actionTimer?: SerializedActionTimer | null,
  condition: boolean = true,
  onExpire?: () => void
): number {
  const [countdown, setCountdown] = useState<number>(0);
  const hasCalledExpireRef = useRef<string | null>(null);

  useEffect(() => {
    // Reset countdown if timer is not active or condition is false
    if (!actionTimer || actionTimer.isPaused || !condition) {
      setCountdown(0);
      hasCalledExpireRef.current = null;
      return;
    }

    // Create unique key for this timer instance
    const timerKey = `${actionTimer.startTime}-${actionTimer.duration}`;

    // Calculate initial countdown
    const startTime = new Date(actionTimer.startTime).getTime();
    const elapsed = (Date.now() - startTime) / 1000;
    const remaining = Math.max(0, actionTimer.duration - elapsed);
    setCountdown(Math.ceil(remaining));

    // If timer already expired and callback hasn't been called for this timer
    if (remaining <= 0 && onExpire && hasCalledExpireRef.current !== timerKey) {
      hasCalledExpireRef.current = timerKey;
      onExpire();
      return;
    }

    // Update countdown every 100ms for smooth display
    const interval = setInterval(() => {
      const currentElapsed = (Date.now() - startTime) / 1000;
      const currentRemaining = Math.max(0, actionTimer.duration - currentElapsed);
      setCountdown(Math.ceil(currentRemaining));

      // Clear interval and call onExpire if timer has expired
      if (currentRemaining <= 0) {
        clearInterval(interval);
        if (onExpire && hasCalledExpireRef.current !== timerKey) {
          hasCalledExpireRef.current = timerKey;
          onExpire();
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [actionTimer, condition, onExpire]);

  return countdown;
}
