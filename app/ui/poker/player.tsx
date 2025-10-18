// app/ui/poker/player.tsx

'use client';

import { usePoker } from '@/app/lib/providers/poker-provider';
import { useUser } from '@/app/lib/providers/user-provider';
import Hand from './hand';
import { getChipTotal } from '@/app/lib/utils/poker';
import type { Player as PlayerType } from '@/app/lib/definitions/poker';
import clsx from 'clsx';

interface PlayerProps {
  index: number;
  player: PlayerType;
  playing: boolean;
  currentPlayerIndex: number;
}

export default function Player({ player, playing, index, currentPlayerIndex }: PlayerProps) {
  const { placeBet } = usePoker();
  const { user } = useUser();

  const isCurrentPlayer = currentPlayerIndex === index;
  const isCurrentUser = user?.id === player.id;

  const handleBet = () => {
    placeBet(1);
  };

  const handleRaise = () => {
    placeBet(2);
  };

  const handleFold = () => {
    // TODO: Implement fold functionality
    console.log('Fold not implemented');
  };

  const handleRemove = () => {
    // TODO: Implement remove player functionality
    console.log('Remove player not implemented');
  };

  const chipTotal = getChipTotal(player.chips);

  return (
    <li
        className={clsx('',
            {
                'rounded-1 border-1' : isCurrentPlayer,
            },
        )}
    >
      <div>
        <div className='flex flex-row gap-1 justify-start items-center'>
            <span className="playerName">{player.username}</span>
            <span className="playerChips">({chipTotal})</span>
        </div>
        <Hand cards={player.hand} />
      </div>

      {playing && isCurrentPlayer && isCurrentUser && (
        <div
            id="playerControls"
            className='flex flex-row items-center justify-start gap-1'
        >
          <button id="betButton" onClick={handleBet}>
            Bet
          </button>
          <button id="raiseButton" onClick={handleRaise}>
            Raise
          </button>
          <button id="foldButton" onClick={handleFold}>
            Fold
          </button>
          <button id="removePlayer" onClick={handleRemove}>
            Leave table
          </button>
        </div>
      )}
    </li>
  );
}
