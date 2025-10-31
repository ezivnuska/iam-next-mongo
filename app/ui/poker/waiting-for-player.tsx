// app/ui/poker/waiting-for-player.tsx

'use client';

import { useState, useEffect } from 'react';

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
  const [countdown, setCountdown] = useState<number>(0);

  useEffect(() => {
    if (!actionTimer || actionTimer.isPaused) {
      setCountdown(0);
      return;
    }

    // Calculate initial countdown
    const startTime = new Date(actionTimer.startTime).getTime();
    const elapsed = (Date.now() - startTime) / 1000;
    const remaining = Math.max(0, actionTimer.duration - elapsed);
    setCountdown(Math.ceil(remaining));

    // Update countdown every 100ms
    const interval = setInterval(() => {
      const currentElapsed = (Date.now() - startTime) / 1000;
      const currentRemaining = Math.max(0, actionTimer.duration - currentElapsed);
      setCountdown(Math.ceil(currentRemaining));
    }, 100);

    return () => clearInterval(interval);
  }, [actionTimer]);

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
