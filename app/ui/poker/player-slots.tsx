// app/ui/poker/player-slots.tsx

'use client';

import { memo } from 'react';
import Player from './player';
import { Button } from '../button';
import type { Player as PlayerType } from '@/app/lib/definitions/poker';

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

  const isUserInGame = players.some(p => p.id === currentUserId);
  const firstEmptySlotIndex = players.length;

  // Show button if user is not in game, game is not locked (in progress), and table is not full
  const canJoin = !isUserInGame && !locked && players.length < MAX_SLOTS;

  return (
    <ul className='flex flex-row gap-2 justify-evenly'>
      {slots.map((slotIndex) => {
        const player = players[slotIndex];

        if (player) {
          // Show actual player
          const isCurrentUser = player.id === currentUserId;
          return (
            <Player
              key={player.id}
              player={player}
              index={slotIndex}
              locked={locked}
              currentPlayerIndex={currentPlayerIndex}
              potContribution={0}
              isCurrentUser={isCurrentUser}
              onLeaveGame={onLeaveGame}
            />
          );
        }

        // Show empty slot
        const isFirstEmptySlot = slotIndex === firstEmptySlotIndex;

        return (
          <li
            key={slotIndex}
            className='flex flex-col items-center gap-2 p-4 border rounded-lg bg-gray-50'
          >
            {/* Player avatar skeleton */}
            <div className='w-16 h-16 rounded-full bg-gray-200 animate-pulse' />

            {/* Show join button in first empty slot */}
            {isFirstEmptySlot && canJoin ? (
              <Button size='sm' onClick={onJoinGame} className='text-sm'>
                Join
              </Button>
            ) : (
              <>
                {/* Player name skeleton */}
                <div className='w-20 h-4 bg-gray-200 rounded animate-pulse' />

                {/* Chip count skeleton */}
                <div className='w-12 h-3 bg-gray-200 rounded animate-pulse' />
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default memo(PlayerSlots);
