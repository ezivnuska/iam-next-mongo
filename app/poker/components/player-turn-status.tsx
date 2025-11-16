// app/poker/components/player-turn-status.tsx

'use client';

import { useActionTimerPercentage } from '@/app/poker/lib/hooks/use-action-timer-percentage';
import type { SerializedActionTimer } from '@/app/poker/lib/definitions/poker';

interface PlayerTurnStatusProps {
  playerName: string;
  actionTimer?: SerializedActionTimer;
}

/**
 * Displays waiting status with progress bar
 *
 * Shows "Waiting for [player]..." with a background progress bar showing time remaining
 */
export default function PlayerTurnStatus({ playerName, actionTimer }: PlayerTurnStatusProps) {
  const timePercentage = useActionTimerPercentage(actionTimer);

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
