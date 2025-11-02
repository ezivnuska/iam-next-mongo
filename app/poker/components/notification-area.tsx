// app/poker/components/notification-area.tsx

'use client';

import { useGameState, usePlayers } from '@/app/poker/lib/providers/poker-provider';
import { useUser } from '@/app/lib/providers/user-provider';
import GameNotification from './game-notification';
import GameCountdownTimer from './game-countdown-timer';
import PlayerTurnStatus from './player-turn-status';

/**
 * Fixed-height notification area that prevents layout shifts
 *
 * Contains all game status displays in a fixed space with priority system:
 * 1. Game notifications (blinds, deals)
 * 2. Player turn status (your turn / waiting for player)
 * 3. Game countdown timers (restart/lock)
 *
 * When no notifications are active, the space remains but is empty,
 * preventing communal cards from jumping around.
 */
export default function NotificationArea() {
  const { gameNotification, actionTimer, locked, currentPlayerIndex } = useGameState();
  const { players } = usePlayers();
  const { user } = useUser();

  // Determine if we should show player turn status
  const isUserInGame = user?.username && players.some(p => p.username === user.username);
  const currentPlayer = players[currentPlayerIndex];
  const isCurrentUserTurn = user?.id === currentPlayer?.id;
  const showPlayerTurnStatus = locked && isUserInGame && currentPlayer;

  return (
    <div className="h-12 flex flex-1 items-center justify-center">
      {/* Priority 1: Game notifications (blinds, deals) show first */}
      {gameNotification ? (
        <GameNotification notification={gameNotification} />
      ) : showPlayerTurnStatus ? (
        /* Priority 2: Player turn status (your turn / waiting for player) */
        <PlayerTurnStatus
          playerName={currentPlayer.username}
          isMyTurn={isCurrentUserTurn}
          actionTimer={actionTimer}
        />
      ) : (
        /* Priority 3: Show countdown timer when no active game notification or player turn */
        <GameCountdownTimer />
      )}
    </div>
  );
}
