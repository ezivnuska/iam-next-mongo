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

  // Check if there are any human players
  const humanPlayers = players.filter(p => !p.isAI);
  const hasHumanPlayers = humanPlayers.length > 0;
  const aiPlayer = players.find(p => p.isAI);

  // Show button if user is not in game, game is not locked (in progress), and table is not full
  const canJoin = !isUserInGame && !locked && players.length < MAX_SLOTS;

  return (
    <ul className='flex flex-1 flex-col gap-2'>
      {/* Show AI player as first item if no human players have joined */}
      {/* {!hasHumanPlayers && aiPlayer && (
        <li key={aiPlayer.id}>
          <Player
            player={aiPlayer}
            index={0}
            locked={locked}
            currentPlayerIndex={currentPlayerIndex}
            potContribution={0}
            isCurrentUser={false}
            totalPlayers={players.length}
          />
        </li>
      )} */}

      {slots.map((slotIndex) => {
        const player = players[slotIndex];

        if (player) {
          const isCurrentUser = player.id === currentUserId;

          // If no human players, skip AI here (already shown above)
        //   if (!hasHumanPlayers && player.isAI) {
        //     return null;
        //   }

        //   if (!isUserInGame) {
        //     return null;
        //   }

          // Show actual player wrapped in <li>
          return (
            <li key={player.id} className='flex'>
              <Player
                player={player}
                index={slotIndex}
                locked={locked}
                currentPlayerIndex={currentPlayerIndex}
                potContribution={0}
                isCurrentUser={isCurrentUser}
                totalPlayers={players.length}
              />
            </li>
          );
        }

        // // Show empty slot with current user and Join button
        // const isFirstEmptySlot = slotIndex === players.length;

        // return !isUserInGame && isFirstEmptySlot && user && (
        //     <li key={slotIndex} className='flex'>
        //         <div className='flex flex-row gap-2 items-center text-white'>
        //             <UserAvatar size={44} username={user.username} />
        //             <div className='flex flex-row gap-1 sm:gap-0 sm:flex-col items-center'>
        //                 <span className='text-md'>{user.username}</span>
        //             </div>
        //         </div>
        //     </li>
        // );
      })}
    </ul>
  );
}

export default memo(PlayerSlots);
