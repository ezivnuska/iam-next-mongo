// app/poker/lib/hooks/use-notification-pot-sync.ts
/**
 * Syncs pot state when notifications are shown.
 * This ensures pot updates happen when the notification appears on screen,
 * creating proper visual timing with sound effects.
 */

'use client';

import { useEffect, useRef } from 'react';
import { useNotifications } from '../providers/notification-provider';
import { usePotSync } from './use-pot-sync';

export function useNotificationPotSync() {
  const { currentNotification } = useNotifications();
  const { syncPotFromNotification, shouldSyncPot } = usePotSync();
  const lastNotificationIdRef = useRef<string | null>(null);

  useEffect(() => {
    // Only sync when a NEW notification is shown
    if (!currentNotification || currentNotification.id === lastNotificationIdRef.current) {
      return;
    }

    // Update ref to track this notification
    lastNotificationIdRef.current = currentNotification.id;

    // Check if this notification has metadata with pot sync data
    const metadata = currentNotification.metadata;
    if (!metadata) {
      return;
    }

    // Sync pot if this is a betting-related notification
    if (shouldSyncPot(metadata.notificationType)) {
      syncPotFromNotification(metadata);
    }
  }, [currentNotification, syncPotFromNotification, shouldSyncPot]);
}
