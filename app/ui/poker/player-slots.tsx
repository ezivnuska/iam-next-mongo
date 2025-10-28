// app/ui/poker/player-slots.tsx

'use client';

import { memo } from 'react';
import Player from './player';
import { Button } from '../button';
import type { Player as PlayerType } from '@/app/lib/definitions/poker';
import { useUser } from '@/app/lib/providers/user-provider';
import UserAvatar from '../user/user-avatar';

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

  // Show button if user is not in game, game is not locked (in progress), and table is not full
  const canJoin = !isUserInGame && !locked && players.length < MAX_SLOTS;

  return (
    <ul className='flex border-1 flex-col sm:flex-row gap-2 sm:justify-between'>
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

        return isFirstEmptySlot && canJoin && (
          <li
            key={slotIndex}
            className='flex flex-1 flex-row sm:flex-col items-center sm:items-center gap-2 px-4 py-2 border rounded-lg bg-gray-50'
          >
            <UserAvatar size={50} username={user?.username!} />
            {/* Player avatar skeleton */}
            {/* {isFirstEmptySlot && canJoin ? (
                <UserAvatar size={50} username={currentUser?.username!} />
            ) : (
                <div className='w-[50px] h-[50px] rounded-full bg-gray-200 animate-pulse flex-shrink-0' />
            )} */}

            <Button size='sm' onClick={onJoinGame} className='text-sm'>
                Join
            </Button>
            {/* Show join button in first empty slot */}
            {/* {isFirstEmptySlot && canJoin ? (
            ) : (
              <div className='flex flex-col xs:flex-col md:flex-row gap-2 md:gap-1 items-center xs:items-start border xs:items-start'>
                <div className='w-20 h-4 bg-gray-200 rounded animate-pulse' />

                <div className='w-12 h-3 bg-gray-200 rounded animate-pulse' />
              </div>
            )} */}
          </li>
        );
      })}
    </ul>
  );
}

export default memo(PlayerSlots);
