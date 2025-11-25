// app/poker/components/poker-notification-display.tsx
'use client';

import { useEffect } from 'react';
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
  const { playSound } = usePokerActions();

  useEffect(() => {
    if (!notification) return;

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
  }, [notification, playSound]);

  if (!notification) {
    return null;
  }

  return (
    <div className="relative w-full h-full overflow-hidden rounded-full shadow-lg bg-green-900">
      <div className="relative h-full px-4 font-semibold text-center">
        <div className="relative z-10 flex flex-row h-full items-center justify-center gap-4">
          <span className='text-white'>{notification.message}</span>
        </div>
      </div>
    </div>
  );
}
