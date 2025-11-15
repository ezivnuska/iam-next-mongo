// app/poker/lib/providers/player-notification-provider.tsx

'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react';
import type { PokerSoundType } from '../hooks/use-poker-sounds';

export interface PlayerNotification {
  playerId: string;
  message: string;
  timestamp: number;
  isBlind?: boolean; // Flag to identify blind notifications for sound effects
}

interface PlayerNotificationContextType {
  activeNotifications: Map<string, PlayerNotification>;
  showPlayerNotification: (notification: PlayerNotification, playSound?: (sound: PokerSoundType) => void) => void;
  clearPlayerNotification: (playerId: string) => void;
  clearAllPlayerNotifications: () => void;
  getPlayerNotification: (playerId: string) => PlayerNotification | undefined;
}

const PlayerNotificationContext = createContext<PlayerNotificationContextType | undefined>(undefined);

export function PlayerNotificationProvider({ children }: { children: ReactNode }) {
  const [activeNotifications, setActiveNotifications] = useState<Map<string, PlayerNotification>>(new Map());

  // Show a notification for a specific player
  const showPlayerNotification = useCallback((notification: PlayerNotification, playSound?: (sound: PokerSoundType) => void) => {
    const { playerId } = notification;

    console.log('[PlayerNotificationProvider] Showing notification for player:', playerId, notification.message);

    // Sound effects removed - player actions are silent in notification provider
    // Individual sounds are handled by:
    // - Optimistic feedback in player-controls.tsx for user's own actions
    // - Socket handlers in poker-socket-handlers.ts for other players' actions

    // Set notification (persists until cleared by stage advance)
    setActiveNotifications(prev => {
      const next = new Map(prev);
      next.set(playerId, notification);
      return next;
    });
  }, []);

  // Clear notification for a specific player
  const clearPlayerNotification = useCallback((playerId: string) => {
    setActiveNotifications(prev => {
      const next = new Map(prev);
      next.delete(playerId);
      return next;
    });
  }, []);

  // Clear all player notifications (called on stage advance)
  const clearAllPlayerNotifications = useCallback(() => {
    console.log('[PlayerNotificationProvider] Clearing all player notifications');
    setActiveNotifications(new Map());
  }, []);

  // Get notification for a specific player
  const getPlayerNotification = useCallback((playerId: string) => {
    return activeNotifications.get(playerId);
  }, [activeNotifications]);

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
