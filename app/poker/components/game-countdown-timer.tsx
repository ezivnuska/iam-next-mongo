// app/poker/components/game-countdown-timer.tsx

'use client';

import { memo, useState, useEffect } from 'react';
import { useGameState, usePokerActions, usePlayers } from '@/app/poker/lib/providers/poker-provider';
import { useUser } from '@/app/lib/providers/user-provider';
import { Button } from '@/app/ui/button';

/**
 * Unified countdown timer component that handles:
 * 1. Game restart countdown with winner display (after game ends)
 * 2. Game start countdown (when 2nd player joins)
 *
 * When a winner is determined, shows the winner information along with
 * the restart countdown timer.
 *
 * Priority: Restart timer takes precedence over lock timer
 */
function GameCountdownTimer() {
  const { winner, restartCountdown, lockTime, locked } = useGameState();
  const { leaveGame } = usePokerActions();
  const { players } = usePlayers();
  const { user } = useUser();
  const [lockCountdown, setLockCountdown] = useState(0);

  // Check if current user is in the game
  const isUserInGame = user && players.some(p => p.id === user.id);

  // Calculate lock timer countdown
  useEffect(() => {
    // Don't show if no lockTime or already locked
    if (!lockTime || locked) {
      setLockCountdown(0);
      return;
    }

    const calculateRemaining = () => {
      const lockTimestamp = new Date(lockTime).getTime();
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((lockTimestamp - now) / 1000));
      setLockCountdown(remaining);
    };

    // Calculate immediately
    calculateRemaining();

    // Update every second
    const interval = setInterval(calculateRemaining, 1000);

    return () => clearInterval(interval);
  }, [lockTime, locked]);

  // Determine which timer to show (restart takes priority)
  const showRestartTimer = winner && restartCountdown;
  const showLockTimer = !showRestartTimer && lockTime && !locked && lockCountdown > 0;

  // Don't render if no timer is active
  if (!showRestartTimer && !showLockTimer) return null;

  // Render restart timer with winner display
  if (showRestartTimer) {
    return (
      <div
        className="w-full max-w-2xl bg-green-600 text-white px-4 py-3 rounded-lg shadow-lg flex flex-col items-center justify-center gap-2 animate-fade-in"
        role="status"
        aria-live="polite"
      >
        {/* Winner Information */}
        <div className="flex flex-col items-center gap-1">
          {winner?.isTie ? (
            <>
              <h3 className="text-xl font-bold">It&apos;s a Tie!</h3>
              <p className="text-sm">Players: {winner.tiedPlayers?.join(', ')}</p>
              <p className="text-sm">Hand: {winner.handRank}</p>
            </>
          ) : (
            <h3 className="text-xl font-bold">{winner?.winnerName} Wins with a {winner?.handRank}!</h3>
          )}
        </div>

        {/* Restart Timer */}
        <div className="flex items-center justify-center gap-3">
          {/* Timer Icon */}
          <svg
            className="h-4 w-4 text-white"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>

          {/* Message */}
          <span className="font-medium">
            New game in <span className="font-bold">{restartCountdown}</span> second{restartCountdown !== 1 ? 's' : ''}
          </span>

          {/* Leave Button */}
          {isUserInGame && (
            <Button
              size='sm'
              onClick={leaveGame}
              className="bg-white text-green-700 hover:bg-gray-100 border-0"
            >
              Leave
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Render lock timer
  if (showLockTimer) {
    return (
      <div className="w-full max-w-2xl">
        <div className="bg-blue-50 border-2 border-blue-300 rounded-lg px-4 py-2 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">⏱️</span>
              <p className="text-blue-900 font-semibold">
                Next deal in {lockCountdown} second{lockCountdown !== 1 ? 's' : ''}
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

  return null;
}

export default memo(GameCountdownTimer);
