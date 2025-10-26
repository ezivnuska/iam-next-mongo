// app/ui/poker/player.tsx

'use client';

import PlayerCard from './player-card';
import Hand from './hand';
import { getChipTotal } from '@/app/lib/utils/poker';
import type { Player as PlayerType } from '@/app/lib/definitions/poker';
import clsx from 'clsx';
import { Button } from '../button';
import { usePokerActions } from '@/app/lib/providers/poker-provider';

interface PlayerProps {
  index: number;
  player: PlayerType;
  locked: boolean;
  currentPlayerIndex: number;
  potContribution: number;
  isCurrentUser?: boolean;
  onLeaveGame?: () => void;
}

export default function Player({ player, locked, index, currentPlayerIndex, potContribution, isCurrentUser, onLeaveGame }: PlayerProps) {
  const chipTotal = getChipTotal(player.chips);
  const isCurrentPlayer = index === currentPlayerIndex;

  return (
    <li className={clsx('rounded-lg border-1 py-2 px-2',
        {
            'bg-green-300': currentPlayerIndex === index,
        },
    )}>
      <div className='flex flex-col gap-2 items-center'>
        <div className='flex flex-col justify-center items-center'>
            <span className="playerName">{player.username}</span>
            <span className="playerChips">({chipTotal})</span>
            {potContribution > 0 && (
              <span className="text-xs text-gray-700">Pot: ${potContribution}</span>
            )}
        </div>
        {player.hand.length > 0 && <Hand cards={player.hand} />}
        {isCurrentUser && !locked && onLeaveGame && (
          <Button size='sm' onClick={onLeaveGame} className="mt-2 text-sm">
            Leave
          </Button>
        )}
      </div>
    </li>
  );
}
