// app/poker/components/poker-notification-display.tsx
'use client';

import { useEffect, useState } from 'react';
import { type Notification } from '@/app/poker/lib/providers/notification-provider';
import { usePokerActions } from '@/app/poker/lib/providers/poker-provider';

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
  const { playSound } = usePokerActions();

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
      } else if (notification.type === 'deal') {
        playSound('card-deal');
      }
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
    <div className="relative w-full overflow-hidden rounded-lg shadow-lg">
      {/* Notification content */}
      <div className={`relative px-4 py-3 ${bgStyle} font-semibold text-center`}>
        {/* Progress bar background */}
        <div
          className="absolute inset-0 bg-gray-200 transition-all duration-100 ease-linear"
          style={{
            width: `${progress}%`,
            opacity: 0.1,
          }}
        />

        {/* Message text */}
        <span className="relative z-10">{notification.message}</span>
      </div>

      {/* Timer progress indicator */}
      <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-300">
        <div
          className="h-full bg-white transition-all duration-100 ease-linear"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
