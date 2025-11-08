// app/ui/poker/player-slots.tsx

'use client';

import { memo } from 'react';
import Player from './player';
import { Button } from '@/app/ui/button';
import type { Player as PlayerType } from '@/app/poker/lib/definitions/poker';
import { useUser } from '@/app/lib/providers/user-provider';
import UserAvatar from '@/app/ui/user/user-avatar';

interface PlayerSlotsProps {
  players: PlayerType[];
  locked: boolean;
  currentPlayerIndex: number;
  currentUserId?: string;
  gameId: string | null;
  onJoinGame: () => void;
  onLeaveGame: () => void;
}

function PlayerSlots({ players, locked, currentPlayerIndex, currentUserId, gameId, onJoinGame, onLeaveGame }: PlayerSlotsProps) {
  const MAX_SLOTS = 5;
  const slots = Array.from({ length: MAX_SLOTS }, (_, i) => i);

  const { user } = useUser()
  const isUserInGame = players.some(p => p.id === currentUserId);
  const firstEmptySlotIndex = players.length;

  // Check if there are any human players
  const humanPlayers = players.filter(p => !p.isAI);
  const hasHumanPlayers = humanPlayers.length > 0;
  const aiPlayer = players.find(p => p.isAI);

  // Show button if user is not in game, game is not locked (in progress), and table is not full
  const canJoin = !isUserInGame && !locked && players.length < MAX_SLOTS;

  return (
    <ul className='flex flex-1 flex-col gap-2'>
      {/* Show AI player as first item if no human players have joined */}
      {!hasHumanPlayers && aiPlayer && (
        <Player
          key={aiPlayer.id}
          player={aiPlayer}
          index={0}
          locked={locked}
          currentPlayerIndex={currentPlayerIndex}
          potContribution={0}
          isCurrentUser={false}
          totalPlayers={players.length}
          onLeaveGame={onLeaveGame}
        />
      )}

      {slots.map((slotIndex) => {
        const player = players[slotIndex];

        if (player) {
          // Skip the current user - they're displayed separately in poker-table
          const isCurrentUser = player.id === currentUserId;
          if (isCurrentUser) {
            return null;
          }

          // If no human players, skip AI here (already shown above)
          if (!hasHumanPlayers && player.isAI) {
            return null;
          }

          // Show actual player
          return (
            <Player
              key={player.id}
              player={player}
              index={slotIndex}
              locked={locked}
              currentPlayerIndex={currentPlayerIndex}
              potContribution={0}
              isCurrentUser={isCurrentUser}
              totalPlayers={players.length}
              onLeaveGame={onLeaveGame}
            />
          );
        }

        // Show empty slot
        const isFirstEmptySlot = slotIndex === firstEmptySlotIndex;

        return isFirstEmptySlot && canJoin && (
          <li
            key={slotIndex}
            className='flex flex-row items-center justify-between gap-2 px-2 py-1 rounded-xl bg-gray-50'
          >
            <UserAvatar size={44} username={user?.username!} />

            <Button size='md' onClick={onJoinGame} className='text-sm'>
                Join
            </Button>
          </li>
        );
      })}
    </ul>
  );
}

export default memo(PlayerSlots);
