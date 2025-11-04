// app/poker/components/player-turn-status.tsx

'use client';

import { useState, useEffect } from 'react';

interface PlayerTurnStatusProps {
  playerName: string;
  actionTimer?: {
    startTime: string;
    duration: number;
    targetPlayerId?: string;
    isPaused: boolean;
  };
}

/**
 * Displays waiting status with progress bar
 *
 * Shows "Waiting for [player]..." with a background progress bar showing time remaining
 */
export default function PlayerTurnStatus({ playerName, actionTimer }: PlayerTurnStatusProps) {
  const [timePercentage, setTimePercentage] = useState<number>(0);

  useEffect(() => {
    // Reset percentage if timer is not active
    if (!actionTimer || actionTimer.isPaused) {
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
    const interval = setInterval(() => {
      const newPercentage = calculatePercentage();
      setTimePercentage(newPercentage);

      // Stop updating when time runs out
      if (newPercentage <= 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [actionTimer]);

  return (
    <div
      className="relative flex flex-1 items-center justify-center gap-3 p-2 bg-gray-800 text-white rounded-lg overflow-hidden"
      role="status"
      aria-live="polite"
    >
      {/* Progress bar background */}
      {timePercentage > 0 && (
        <div
          className="absolute left-0 top-0 h-full bg-blue-600/30 transition-all duration-100 ease-linear"
          style={{ width: `${timePercentage}%` }}
          aria-hidden="true"
        />
      )}

      {/* Content - always show waiting text */}
      <div className="relative z-10 flex items-center justify-center gap-3">
        <span className="font-medium">
          Waiting for <span className="font-bold">{playerName}</span>...
        </span>
      </div>
    </div>
  );
}
