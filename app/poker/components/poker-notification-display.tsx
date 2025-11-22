// app/poker/components/poker-notification-display.tsx
'use client';

import { useEffect, useState, useMemo } from 'react';
import { type Notification } from '@/app/poker/lib/providers/notification-provider';
import { usePokerActions, usePlayers, useViewers } from '@/app/poker/lib/providers/poker-provider';
import { useUser } from '@/app/lib/providers/user-provider';
import { Button } from '@/app/ui/button';

interface PokerNotificationDisplayProps {
  notification: Notification | null;
}

/**
 * Centralized notification display component for poker game events.
 * Features:
 * - Timer-driven progress bar showing time remaining
 * - Absolutely positioned background element
 * - Styled based on notification type
 * - Auto-completion handled by NotificationProvider
 * - Sound effects play when notification appears
 */
export default function PokerNotificationDisplay({ notification }: PokerNotificationDisplayProps) {
  const [progress, setProgress] = useState(100);
  const { playSound, joinGame, leaveGame } = usePokerActions();
  const { players } = usePlayers();
  const { gameId } = useViewers();
  const { user } = useUser();

  // Check if user is in game
  const isUserInGame = useMemo(() => {
    return players.some(p => p.id === user?.id);
  }, [players, user?.id]);

  // Check if this is a game_starting notification
  const isGameStarting = notification?.metadata?.notificationType === 'game_starting';

  useEffect(() => {
    if (!notification) {
      setProgress(100);
      return;
    }

    const startTime = Date.now();
    const { duration } = notification;

    // Play sound effect based on notification type
    if (playSound) {
      if (notification.type === 'blind') {
        playSound('chips');
      } else if (notification.type === 'action') {
        playSound('chips');
      }
      // Note: 'deal' type notifications do not play sounds here
      // Card sounds are played by the stage coordinator when cards are revealed
    }

    // Update progress bar every 16ms (~60fps)
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, duration - elapsed);
      const newProgress = (remaining / duration) * 100;

      setProgress(newProgress);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 16);

    return () => clearInterval(interval);
  }, [notification, playSound]);

  if (!notification) {
    return null;
  }

  // Type-based styling
  const typeStyles = {
    action: 'bg-blue-500 text-white',
    blind: 'bg-yellow-500 text-black',
    info: 'bg-gray-500 text-white',
    deal: 'bg-green-500 text-white',
    countdown: 'bg-purple-500 text-white',
  };

  const bgStyle = typeStyles[notification.type] || typeStyles.info;

  return (
    <div className="relative w-full h-full overflow-hidden rounded-full shadow-lg bg-green-900">
      {/* Notification content */}
      <div className={`relative h-full px-4 font-semibold text-center`}>
      {/* <div className={`relative px-4 ${bgStyle} font-semibold text-center`}> */}
      {/* <div className={`relative px-4 py-3 ${bgStyle} font-semibold text-center`}> */}
        {/* Progress bar background */}
        {/* <div
          className="absolute inset-0 transition-all duration-100 ease-linear"
        //   className="absolute inset-0 bg-gray-200 transition-all duration-100 ease-linear"
          style={{
            width: `${progress}%`,
            opacity: 0.1,
          }}
        /> */}

        {/* Message text and optional buttons */}
        <div className="relative z-10 flex flex-row h-full items-center justify-center gap-4">
          <span className='text-white'>{notification.message}</span>

          {/* Join/Leave buttons for game_starting notification */}
          {isGameStarting && (
            <>
              {isUserInGame ? (
                <Button
                  size="sm"
                  onClick={leaveGame}
                  className="bg-green-700 hover:bg-red-700 text-white text-md px-3 rounded-full"
                >
                  Leave Table
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => gameId && joinGame(gameId)}
                  className="bg-green-600 hover:bg-green-700 text-white text-md px-3 rounded-full"
                >
                  Join Game
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Timer progress indicator */}
      {/* <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-300">
        <div
          className="h-full bg-white transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div> */}
    </div>
  );
}
