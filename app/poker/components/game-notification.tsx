// app/ui/poker/game-notification.tsx

'use client';

import { useEffect, useState } from 'react';

interface GameNotification {
  id: string;
  message: string;
  type: 'blind' | 'deal' | 'action' | 'info';
  timestamp: number;
  duration?: number;
}

interface GameNotificationProps {
  notification: GameNotification | null;
}

export default function GameNotification({ notification }: GameNotificationProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [notification]);

  if (!notification || !isVisible) {
    return null;
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case 'blind':
        return '💰';
      case 'deal':
        return '🃏';
      case 'action':
        return '⚡';
      default:
        return 'ℹ️';
    }
  };

  const getBgColorForType = (type: string) => {
    switch (type) {
      case 'blind':
        return 'bg-yellow-50 border-yellow-400';
      case 'deal':
        return 'bg-blue-50 border-blue-400';
      case 'action':
        return 'bg-green-50 border-green-400';
      default:
        return 'bg-gray-50 border-gray-400';
    }
  };

  const getTextColorForType = (type: string) => {
    switch (type) {
      case 'blind':
        return 'text-yellow-900';
      case 'deal':
        return 'text-blue-900';
      case 'action':
        return 'text-green-900';
      default:
        return 'text-gray-900';
    }
  };

  return (
    <div className="w-full max-w-2xl animate-fade-in">
      <div className={`${getBgColorForType(notification.type)} border-2 rounded-lg px-4 py-2 shadow-lg`}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{getIconForType(notification.type)}</span>
          <p className={`${getTextColorForType(notification.type)} font-semibold`}>
            {notification.message}
          </p>
        </div>
      </div>
    </div>
  );
}
