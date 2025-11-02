// app/poker/components/player-turn-status.tsx

'use client';

import { useActionTimerCountdown } from '@/app/poker/lib/hooks/use-action-timer-countdown';

interface PlayerTurnStatusProps {
  playerName: string;
  isMyTurn: boolean;
  actionTimer?: {
    startTime: string;
    duration: number;
    targetPlayerId?: string;
    isPaused: boolean;
  };
}

/**
 * Displays turn status with countdown timer
 *
 * Shows either:
 * - "Your turn" when it's the current user's turn
 * - "Waiting for [player]..." when it's another player's turn
 *
 * Both display use the same style with countdown timer
 */
export default function PlayerTurnStatus({ playerName, isMyTurn, actionTimer }: PlayerTurnStatusProps) {
  // Use custom hook for countdown logic
  const countdown = useActionTimerCountdown(actionTimer);

  return (
    <div
      className="flex flex-1 items-center justify-center gap-3 p-2 bg-gray-800 text-white rounded-lg"
      role="status"
      aria-live="polite"
    >
      {isMyTurn ? (
        <>
          <span className="font-medium">
            Your turn
          </span>
          {countdown > 0 && (
            <span className="font-bold text-yellow-400">
              ({countdown}s)
            </span>
          )}
        </>
      ) : (
        <>
          <span className="font-medium">
            Waiting for <span className="font-bold">{playerName}</span>...
          </span>
          {countdown > 0 && (
            <span className="font-bold text-yellow-400">
              ({countdown}s)
            </span>
          )}
        </>
      )}
    </div>
  );
}
