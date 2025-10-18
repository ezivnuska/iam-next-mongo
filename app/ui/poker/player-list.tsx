// app/ui/poker/player-list.tsx

'use client';

import Player from './player';
import type { Player as PlayerType } from '@/app/lib/definitions/poker';

interface PlayerListProps {
  players: PlayerType[];
  playing: boolean;
  currentPlayerIndex: number;
}

export default function PlayerList({ players, playing, currentPlayerIndex }: PlayerListProps) {
  return (
    <ul id="players">
      {players.map((player, index) => (
        <Player
          key={player.id}
          player={player}
          index={index}
          playing={playing}
          currentPlayerIndex={currentPlayerIndex}
        />
      ))}
    </ul>
  );
}
