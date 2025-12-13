// app/poker/lib/hooks/use-pot-sync.ts

/**
 * Centralized pot synchronization hook
 *
 * This hook provides a single source of truth for pot updates based on socket events.
 * It synchronizes pot, playerBets, and currentPlayerIndex whenever betting actions occur.
 *
 * Benefits:
 * - Eliminates duplicate pot update logic across components
 * - Ensures pot display is always in sync with server state
 * - Ties pot updates directly to notification events for visual consistency
 * - Simplifies debugging by centralizing all pot update logic
 */

'use client';

import { useCallback } from 'react';
import type { PokerNotificationPayload } from '@/app/lib/socket/events';
import { usePokerActions } from '../providers/poker-provider';

export function usePotSync() {
  const { setPot, setPlayerBets, setCurrentPlayerIndex } = usePokerActions();

  /**
   * Synchronize pot state from a notification event payload
   * Called when betting-related notifications are received
   */
  const syncPotFromNotification = useCallback((payload: PokerNotificationPayload) => {
    // Only sync if pot data is included in the payload
    if (!payload.pot || !payload.playerBets || payload.currentPlayerIndex === undefined) {
      return false;
    }

    // Update pot state
    setPot(payload.pot);
    setPlayerBets(payload.playerBets);
    setCurrentPlayerIndex(payload.currentPlayerIndex);

    return true;
  }, [setPot, setPlayerBets, setCurrentPlayerIndex]);

  /**
   * Check if a notification type should trigger pot sync
   */
  const shouldSyncPot = useCallback((notificationType: string): boolean => {
    const syncTypes = [
      'player_bet',
      'player_raise',
      'player_call',
      'player_all_in',
      'blind_posted',
    ];
    return syncTypes.includes(notificationType);
  }, []);

  return {
    syncPotFromNotification,
    shouldSyncPot,
  };
}
