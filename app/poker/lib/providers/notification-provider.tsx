// app/poker/lib/providers/notification-provider.tsx

'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from 'react';

// Notification types
export type NotificationType = 'blind' | 'deal' | 'action' | 'info' | 'countdown';

export interface Notification {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: number;
  duration: number; // Duration in ms (default 5000)
  metadata?: any; // Optional metadata for pot sync and other data
  onComplete?: () => void; // Callback when notification timer completes
}

interface NotificationContextType {
  currentNotification: Notification | null;
  showNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  clearNotification: () => void;
  resetNotifications: () => void;
  isActionNotificationActive: () => boolean;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [currentNotification, setCurrentNotification] = useState<Notification | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const currentNotificationRef = useRef<Notification | null>(null);

  // Keep ref in sync
  useEffect(() => {
    currentNotificationRef.current = currentNotification;
  }, [currentNotification]);

  // Show a new notification immediately (replaces any current notification)
  const showNotification = useCallback((
    notification: Omit<Notification, 'id' | 'timestamp'>
  ) => {
    // Clear existing timer if there is one and execute its callback
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      // Execute previous notification's callback if it exists
      const prevNotification = currentNotificationRef.current;
      if (prevNotification?.onComplete) {
        prevNotification.onComplete();
      }
    }

    const newNotification: Notification = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      duration: notification.duration ?? 5000, // Default 5 seconds
    };

    console.log('[NotificationProvider] Showing notification immediately:', {
      message: newNotification.message,
      type: newNotification.type,
      id: newNotification.id,
    });

    setCurrentNotification(newNotification);

    // Auto-clear after duration and execute callback
    timerRef.current = setTimeout(() => {
      console.log('[NotificationProvider] Notification timer expired:', newNotification.message);

      // Execute onComplete callback if present
      if (newNotification.onComplete) {
        console.log('[NotificationProvider] Executing onComplete callback');
        newNotification.onComplete();
      }

      setCurrentNotification(null);
      timerRef.current = null;
    }, newNotification.duration);
  }, []);

  // Clear current notification
  const clearNotification = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Execute callback if present
    const notification = currentNotificationRef.current;
    if (notification?.onComplete) {
      notification.onComplete();
    }

    setCurrentNotification(null);
  }, []);

  // Reset all notifications (for game reset)
  const resetNotifications = useCallback(() => {
    console.log('[NotificationProvider] Resetting all notifications');

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    setCurrentNotification(null);
  }, []);

  // Check if an action notification is currently active
  const isActionNotificationActive = useCallback(() => {
    return currentNotification?.type === 'action' || currentNotification?.type === 'blind';
  }, [currentNotification]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const value = {
    currentNotification,
    showNotification,
    clearNotification,
    resetNotifications,
    isActionNotificationActive,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}
