// app/poker/lib/providers/player-notification-provider.tsx

'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react';

export interface PlayerNotification {
  playerId: string;
  message: string;
  timestamp: number;
  onComplete?: () => void;
}

interface PlayerNotificationContextType {
  activeNotifications: Map<string, PlayerNotification>;
  showPlayerNotification: (notification: PlayerNotification) => void;
  clearPlayerNotification: (playerId: string) => void;
  clearAllPlayerNotifications: () => void;
  getPlayerNotification: (playerId: string) => PlayerNotification | undefined;
}

const PlayerNotificationContext = createContext<PlayerNotificationContextType | undefined>(undefined);

const PLAYER_NOTIFICATION_DURATION = 2000; // 2 seconds (used for signaling ready)

export function PlayerNotificationProvider({ children }: { children: ReactNode }) {
  const [activeNotifications, setActiveNotifications] = useState<Map<string, PlayerNotification>>(new Map());
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Show a notification for a specific player
  const showPlayerNotification = useCallback((notification: PlayerNotification) => {
    const { playerId } = notification;

    console.log('[PlayerNotificationProvider] Showing notification for player:', playerId, notification.message);

    // Clear existing timer for this player if it exists
    const existingTimer = timersRef.current.get(playerId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new notification (persists until cleared)
    setActiveNotifications(prev => {
      const next = new Map(prev);
      next.set(playerId, notification);
      return next;
    });

    // Set timer to execute onComplete callback after 2 seconds
    // But don't clear the notification - it will persist until stage advance
    if (notification.onComplete) {
      const onCompleteCallback = notification.onComplete; // Capture callback to avoid undefined issue
      const timer = setTimeout(() => {
        console.log('[PlayerNotificationProvider] Executing onComplete callback for player:', playerId);
        try {
          onCompleteCallback();
        } catch (error) {
          console.error('[PlayerNotificationProvider] onComplete callback error:', error);
        }
        timersRef.current.delete(playerId);
      }, PLAYER_NOTIFICATION_DURATION);

      timersRef.current.set(playerId, timer);
    }
  }, []);

  // Clear notification for a specific player
  const clearPlayerNotification = useCallback((playerId: string) => {
    const timer = timersRef.current.get(playerId);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(playerId);
    }

    setActiveNotifications(prev => {
      const next = new Map(prev);
      next.delete(playerId);
      return next;
    });
  }, []);

  // Clear all player notifications (called on stage advance)
  const clearAllPlayerNotifications = useCallback(() => {
    console.log('[PlayerNotificationProvider] Clearing all player notifications');

    // Clear all timers
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current.clear();

    // Clear all notifications
    setActiveNotifications(new Map());
  }, []);

  // Get notification for a specific player
  const getPlayerNotification = useCallback((playerId: string) => {
    return activeNotifications.get(playerId);
  }, [activeNotifications]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(timer => clearTimeout(timer));
      timersRef.current.clear();
    };
  }, []);

  const value = {
    activeNotifications,
    showPlayerNotification,
    clearPlayerNotification,
    clearAllPlayerNotifications,
    getPlayerNotification,
  };

  return (
    <PlayerNotificationContext.Provider value={value}>
      {children}
    </PlayerNotificationContext.Provider>
  );
}

export function usePlayerNotifications() {
  const context = useContext(PlayerNotificationContext);
  if (!context) {
    throw new Error('usePlayerNotifications must be used within PlayerNotificationProvider');
  }
  return context;
}
