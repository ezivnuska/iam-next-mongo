// app/ui/poker/player-action-area.tsx

'use client';

import { usePlayers, useGameState } from '@/app/poker/lib/providers/poker-provider';
import { useUser } from '@/app/lib/providers/user-provider';
import PlayerControls from './player-controls';
import WinnerDisplay from './winner-display';

export default function PlayerActionArea() {
  const { players } = usePlayers();
  const { locked, currentPlayerIndex, winner } = useGameState();
  const { user } = useUser();

  // Check if user is in the game
  const isUserInGame = user?.username && players.some(p => p.username === user.username);

  // Show winner display if there's a winner
  if (winner) {
    return (
      <div className='flex flex-1 flex-col items-stretch'>
        <WinnerDisplay />
      </div>
    );
  }

  // Don't show anything if game is not locked
  if (!locked) return null;

  // Don't show anything if user is not in the game
  if (!isUserInGame) return null;

  // Get the current player whose turn it is
  const currentPlayer = players[currentPlayerIndex];
  if (!currentPlayer) return null;

  // Check if it's the current user's turn
  const isCurrentUserTurn = user?.id === currentPlayer.id;

  // Only show player controls when it's the user's turn
  // "Waiting for player" status is now shown in notification-area
  return (
    <div className='flex flex-1'>
      {isCurrentUserTurn && <PlayerControls />}
    </div>
  );
}
