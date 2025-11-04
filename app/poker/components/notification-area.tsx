// app/poker/components/notification-area.tsx

'use client';

import { useGameState } from '@/app/poker/lib/providers/poker-provider';
import GameNotification from './game-notification';
import GameCountdownTimer from './game-countdown-timer';

/**
 * Fixed-height notification area that prevents layout shifts
 *
 * Contains all game status displays in a fixed space with priority system:
 * 1. Game notifications (blinds, deals)
 * 2. Game countdown timers (restart/lock)
 *
 * When no notifications are active, the space remains but is empty,
 * preventing communal cards from jumping around.
 *
 * Note: Player turn progress bars are now shown in each Player component
 */
export default function NotificationArea() {
  const { gameNotification } = useGameState();

  return (
    <div className="h-12 flex flex-1 items-center justify-center">
      {/* Priority 1: Game notifications (blinds, deals) show first */}
      {gameNotification ? (
        <GameNotification notification={gameNotification} />
      ) : (
        /* Priority 2: Show countdown timer when no active game notification */
        <GameCountdownTimer />
      )}
    </div>
  );
}
