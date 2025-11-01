// app/ui/poker/lock-timer-notification.tsx

'use client';

import { memo, useState, useEffect } from 'react';
import { useGameState, usePokerActions, usePlayers } from '@/app/lib/providers/poker-provider';
import { useUser } from '@/app/lib/providers/user-provider';
import { Button } from '../button';

function LockTimerNotification() {
  const { lockTime, locked } = useGameState();
  const { leaveGame } = usePokerActions();
  const { players } = usePlayers();
  const { user } = useUser();
  const [remainingSeconds, setRemainingSeconds] = useState(0);

  // Check if current user is in the game
  const isUserInGame = user && players.some(p => p.id === user.id);

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
          {/* Leave Button */}
          {isUserInGame && (
            <Button
              size='sm'
              onClick={leaveGame}
              className="bg-white text-blue-700 hover:bg-gray-100 border-0"
            >
              Leave
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default memo(LockTimerNotification);
