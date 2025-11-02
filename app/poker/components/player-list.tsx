// app/ui/poker/player-list.tsx

'use client';

import { memo } from 'react';
import Player from './player';
import type { Player as PlayerType } from '@/app/poker/lib/definitions/poker';
import { useUser } from '@/app/lib/providers/user-provider';
import { useGameState, usePot } from '@/app/poker/lib/providers/poker-provider';

interface PlayerListProps {
  players: PlayerType[];
  locked: boolean;
  currentPlayerIndex: number;
}

function PlayerList({ players, locked, currentPlayerIndex }: PlayerListProps) {
  const { user } = useUser();
  const { playerContributions } = usePot();

  return (
    <div>
        {(players.length === 1) && (
            <>
                {players[0].id === user?.id ? (
                    <p>Waiting for opponent...</p>
                ) : (
                    <p>{players[0].username} waiting...</p>
                )}
            </>
        )}
        
        <ul className='flex flex-row gap-2 justify-evenly'>
            {players.map((player, index) => {
                const potContribution = playerContributions[player.username] || 0;
                return (
                    <Player
                        key={player.id}
                        player={player}
                        index={index}
                        locked={locked}
                        currentPlayerIndex={currentPlayerIndex}
                        potContribution={potContribution}
                        totalPlayers={players.length}
                    />
                );
            })}
        </ul>
    </div>
  );
}

export default memo(PlayerList);
