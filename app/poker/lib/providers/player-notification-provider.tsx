// app/poker/lib/providers/player-notification-provider.tsx

'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useRef, useEffect } from 'react';
import type { PokerSoundType } from '../hooks/use-poker-sounds';

export interface PlayerNotification {
  playerId: string;
  message: string;
  timestamp: number;
  isBlind?: boolean; // Flag to identify blind notifications for sound effects
  duration?: number; // Auto-clear after duration (ms) - optional
  onComplete?: () => void; // Callback when timer completes - optional
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
  const timersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Show a notification for a specific player
  // New notifications automatically replace any existing notification for the same player
  const showPlayerNotification = useCallback((notification: PlayerNotification, playSound?: (sound: PokerSoundType) => void) => {
    const { playerId, duration, onComplete } = notification;

    // Sound effects removed - player actions are silent in notification provider
    // Individual sounds are handled by:
    // - Optimistic feedback in player-controls.tsx for user's own actions
    // - Socket handlers in poker-socket-handlers.ts for other players' actions

    // Clear any existing timer for this player (handles replacement case)
    const existingTimer = timersRef.current.get(playerId);
    if (existingTimer) {
      clearTimeout(existingTimer);
      timersRef.current.delete(playerId);
    }

    // Set notification (persists until cleared by stage advance or timer)
    setActiveNotifications(prev => {
      const next = new Map(prev);
      next.set(playerId, notification);
      return next;
    });

    // If duration is specified, auto-clear after duration
    if (duration) {
      const timer = setTimeout(() => {

        // Execute onComplete callback if present
        if (onComplete) {
          try {
            onComplete();
          } catch (error) {
            console.error('[PlayerNotificationProvider] onComplete callback error:', error);
          }
        }

        // Clear notification
        setActiveNotifications(prev => {
          const next = new Map(prev);
          next.delete(playerId);
          return next;
        });

        timersRef.current.delete(playerId);
      }, duration);

      timersRef.current.set(playerId, timer);
    }
  }, []);

  // Clear notification for a specific player
  const clearPlayerNotification = useCallback((playerId: string) => {
    // Clear timer if exists
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

    // Clear all timers
    timersRef.current.forEach(timer => clearTimeout(timer));
    timersRef.current.clear();

    setActiveNotifications(new Map());
  }, []);

  // Get notification for a specific player
  const getPlayerNotification = useCallback((playerId: string) => {
    return activeNotifications.get(playerId);
  }, [activeNotifications]);

  // Cleanup timers on unmount
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
