// app/ui/poker/lock-timer-notification.tsx

'use client';

import { memo, useState, useEffect } from 'react';
import { useGameState, usePokerActions } from '@/app/lib/providers/poker-provider';

function LockTimerNotification() {
  const { lockTime, locked } = useGameState();
  const { forceLockGame } = usePokerActions();
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  useEffect(() => {
    // Don't show if no lockTime or already locked
    if (!lockTime || locked) {
      setRemainingSeconds(0);
      return;
    }

    const calculateRemaining = () => {
      const lockTimestamp = new Date(lockTime).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((lockTimestamp - now) / 1000));
      setRemainingSeconds(remaining);
    };

    // Calculate immediately
    calculateRemaining();

    // Update every second
    const interval = setInterval(calculateRemaining, 1000);

    return () => clearInterval(interval);
  }, [lockTime, locked]);

  // Hide if no lockTime, already locked, or timer expired
  if (!lockTime || locked || remainingSeconds <= 0) {
    return null;
  }

  return (
    <div className="w-full max-w-2xl mx-auto mb-4">
      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg px-4 py-3 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">⏱️</span>
            <p className="text-blue-900 font-semibold">
              {remainingSeconds} second{remainingSeconds !== 1 ? 's' : ''} left to join game
            </p>
          </div>
          <button
            onClick={forceLockGame}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors shadow-sm"
          >
            Start Now
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(LockTimerNotification);
