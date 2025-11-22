// app/poker/components/poker-dashboard.tsx

'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/app/poker/lib/providers/notification-provider';
import { useGameState } from '@/app/poker/lib/providers/poker-provider';
import { useUser } from '@/app/lib/providers/user-provider';
import { useActionTimerPercentage } from '@/app/poker/lib/hooks/use-action-timer-percentage';
import GameNotification from './game-notification';
import PlayerControls from './player-controls';
import { Button } from '@/app/ui/button';

interface PokerDashboardProps {
  showPlayerControls: boolean;
  onActionTaken: () => void;
  locked: boolean;
  isUserInGame: boolean;
  gameId: string | null;
  joinGame: (gameId: string) => void;
}

/**
 * Centralized poker dashboard component with dynamic progress bar.
 * Displays notifications, player controls, and join button.
 * Progress bar intelligently switches between notification timer and turn timer.
 */
export default function PokerDashboard({
  showPlayerControls,
  onActionTaken,
  locked,
  isUserInGame,
  gameId,
  joinGame,
}: PokerDashboardProps) {
  const { currentNotification } = useNotifications();
  const { actionTimer } = useGameState();
  const { user } = useUser();

  // Notification timer progress (when notification is active)
  const [notificationProgress, setNotificationProgress] = useState(100);

  // Turn timer progress (when it's user's turn and no notification)
  const turnTimerProgress = useActionTimerPercentage(actionTimer, user?.id);

  // Update notification progress
  useEffect(() => {
    if (!currentNotification) {
      setNotificationProgress(0);
      return;
    }

    const startTime = Date.now();
    const { duration } = currentNotification;

    // Update progress bar every 16ms (~60fps)
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      const newProgress = (remaining / duration) * 100;

      setNotificationProgress(newProgress);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [currentNotification]);

  // Determine which progress to show
  // Priority 1: Notification timer (when active)
  // Priority 2: Turn timer (when it's user's turn)
  const progressPercentage = currentNotification
    ? notificationProgress
    : turnTimerProgress;

  return (
    <div className='relative w-11/12 sm:w-1/2 h-full flex-row items-center justify-stretch rounded-full bg-green-900 overflow-hidden'>
      {/* Background Progress Bar */}
      {progressPercentage > 0 && (
        <div
          className="absolute left-0 top-0 bottom-0 bg-white transition-all duration-100 ease-linear"
          style={{
            width: `${progressPercentage}%`,
            opacity: 0.1,
          }}
        />
      )}

      {/* Content Layer */}
      <div className='relative z-10 flex h-12 flex-row items-center justify-center'>
        <GameNotification />

        {showPlayerControls && (
          <PlayerControls onActionTaken={onActionTaken} />
        )}

        {!locked && !isUserInGame && !currentNotification && (
          <Button
            size='md'
            onClick={() => gameId && joinGame(gameId)}
            className='text-md text-white bg-green-950 h-full w-full'
            variant='ghost'
          >
            Start a New Game!
          </Button>
        )}
      </div>
    </div>
  );
}
