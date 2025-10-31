// app/ui/poker/restart-timer-toast.tsx

'use client';

import { useGameState, usePokerActions, usePlayers } from '@/app/lib/providers/poker-provider';
import { useUser } from '@/app/lib/providers/user-provider';
import { Button } from '../button';

export default function RestartTimerToast() {
  const { winner, restartCountdown } = useGameState();
  const { leaveGame } = usePokerActions();
  const { players } = usePlayers();
  const { user } = useUser();

  // Check if current user is in the game
  const isUserInGame = user && players.some(p => p.id === user.id);

  // Don't render if no winner or no countdown
  if (!winner || !restartCountdown) return null;

  return (
    <div
      className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fade-in"
      role="status"
      aria-live="polite"
    >
      <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center gap-4">
        {/* Timer Icon */}
        <svg
          className="h-5 w-5 text-white"
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
          Restarting in <span className="font-bold">{restartCountdown}</span> second{restartCountdown !== 1 ? 's' : ''}
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
