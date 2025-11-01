// app/ui/poker/waiting-for-player.tsx

'use client';

import { useActionTimerCountdown } from '@/app/lib/hooks/use-action-timer-countdown';

interface WaitingForPlayerProps {
  playerName: string;
  actionTimer?: {
    startTime: string;
    duration: number;
    targetPlayerId?: string;
    isPaused: boolean;
  };
}

export default function WaitingForPlayer({ playerName, actionTimer }: WaitingForPlayerProps) {
  // Use custom hook for countdown logic
  const countdown = useActionTimerCountdown(actionTimer);

  return (
    <div
      className="flex items-center justify-center gap-3 p-4 bg-gray-800 text-white rounded-lg"
      role="status"
      aria-live="polite"
    >
      <span className="font-medium">
        Waiting for <span className="font-bold">{playerName}</span>...
      </span>
      {countdown > 0 && (
        <span className="font-bold text-yellow-400">
          ({countdown}s)
        </span>
      )}
    </div>
  );
}
