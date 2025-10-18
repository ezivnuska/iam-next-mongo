// app/ui/poker/player-list.tsx

'use client';

import Player from './player';
import PlayerControls from './player-controls';
import type { Player as PlayerType } from '@/app/lib/definitions/poker';
import { useUser } from '@/app/lib/providers/user-provider';
import { usePoker } from '@/app/lib/providers/poker-provider';

interface PlayerListProps {
  players: PlayerType[];
  playing: boolean;
  currentPlayerIndex: number;
}

export default function PlayerList({ players, playing, currentPlayerIndex }: PlayerListProps) {
  const { user } = useUser();
  const { playerBets } = usePoker();

  return (
    <div>
      <ul className='flex flex-row items-center gap-2'>
        {players.map((player, index) => {
          const isCurrentPlayer = currentPlayerIndex === index;
          const isCurrentUser = user?.id === player.id;
          const currentBet = playerBets[index] || 0;
          return (
            <div key={player.id}>
              <Player
                player={player}
                index={index}
                playing={playing}
                currentPlayerIndex={currentPlayerIndex}
                currentBet={currentBet}
              />

              {playing && isCurrentPlayer && isCurrentUser && (
                <PlayerControls />
              )}
            </div>
          );
        })}
      </ul>
    </div>
  );
}
