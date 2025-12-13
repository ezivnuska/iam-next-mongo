// app/ui/poker/game-notification.tsx

'use client';

import { useNotifications } from '@/app/games/poker/lib/providers/notification-provider';
import { usePokerEventHandler } from '@/app/games/poker/lib/hooks/use-poker-event-handler';
import { useNotificationPotSync } from '@/app/games/poker/lib/hooks/use-notification-pot-sync';
import { useViewers } from '@/app/games/poker/lib/providers/poker-provider';
import PokerNotificationDisplay from './poker-notification-display';

/**
 * Centralized poker game notification component.
 * Uses event-driven notification system with timer-driven progress bars.
 * When notifications display, pot updates and sound effects trigger together.
 */
export default function GameNotification() {
  const { gameId } = useViewers();
  const { currentNotification } = useNotifications();

  // Centralized poker event handler processes all socket events
  usePokerEventHandler(gameId);

  // Sync pot state when notifications are DISPLAYED (not when received)
  // This ensures pot updates happen simultaneously with sound effects
  useNotificationPotSync();

  // Display the current notification from the queue
  // PokerNotificationDisplay handles sound effects
  return <PokerNotificationDisplay notification={currentNotification} />;
}
