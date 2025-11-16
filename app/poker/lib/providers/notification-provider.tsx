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
  const notificationQueueRef = useRef<Notification[]>([]);
  const isProcessingRef = useRef(false);

  // Keep ref in sync
  useEffect(() => {
    currentNotificationRef.current = currentNotification;
  }, [currentNotification]);

  // Process the notification queue
  const processQueue = useCallback(() => {
    // If already processing or queue is empty, return
    if (isProcessingRef.current || notificationQueueRef.current.length === 0) {
      return;
    }

    isProcessingRef.current = true;

    const nextNotification = notificationQueueRef.current.shift()!;

    console.log('[NotificationProvider] Processing queued notification:', {
      message: nextNotification.message,
      type: nextNotification.type,
      id: nextNotification.id,
      duration: nextNotification.duration,
      queueLength: notificationQueueRef.current.length,
      hasOnComplete: !!nextNotification.onComplete,
    });

    setCurrentNotification(nextNotification);

    // Auto-clear after duration and execute callback
    timerRef.current = setTimeout(() => {
      console.log('[NotificationProvider] ⏰ Notification timer expired:', {
        message: nextNotification.message,
        hasOnComplete: !!nextNotification.onComplete,
      });

      // Execute onComplete callback if present
      if (nextNotification.onComplete) {
        console.log('[NotificationProvider] ✅ Executing onComplete callback for:', nextNotification.message);
        try {
          nextNotification.onComplete();
          console.log('[NotificationProvider] ✅ onComplete callback executed successfully');
        } catch (error) {
          console.error('[NotificationProvider] ❌ onComplete callback error:', error);
        }
      }

      setCurrentNotification(null);
      timerRef.current = null;
      isProcessingRef.current = false;

      // Process next notification in queue
      processQueue();
    }, nextNotification.duration);
  }, []);

  // Add a new notification to the queue
  const showNotification = useCallback((
    notification: Omit<Notification, 'id' | 'timestamp'>
  ) => {
    const newNotification: Notification = {
      ...notification,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      duration: notification.duration ?? 5000, // Default 5 seconds
    };

    console.log('[NotificationProvider] Queuing notification:', {
      message: newNotification.message,
      type: newNotification.type,
      id: newNotification.id,
      duration: newNotification.duration,
      currentQueueLength: notificationQueueRef.current.length,
      hasOnComplete: !!newNotification.onComplete,
    });

    // Add to queue
    notificationQueueRef.current.push(newNotification);

    // Start processing if not already processing
    processQueue();
  }, [processQueue]);

  // Clear current notification and process next in queue
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
    isProcessingRef.current = false;

    // Process next notification in queue
    processQueue();
  }, [processQueue]);

  // Reset all notifications (for game reset)
  const resetNotifications = useCallback(() => {
    console.log('[NotificationProvider] Resetting all notifications');

    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    // Clear the queue
    notificationQueueRef.current = [];
    isProcessingRef.current = false;

    setCurrentNotification(null);
  }, []);

  // Check if an action notification is currently active
  // Includes action, blind, and deal (card dealing) notifications
  const isActionNotificationActive = useCallback(() => {
    return currentNotification?.type === 'action' ||
           currentNotification?.type === 'blind' ||
           currentNotification?.type === 'deal';
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
