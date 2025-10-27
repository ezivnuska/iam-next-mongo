// app/ui/poker/player-card.tsx

'use client';
import Hand from './hand';
import { getChipTotal } from '@/app/lib/utils/poker';
import type { Player as PlayerType } from '@/app/lib/definitions/poker';
import clsx from 'clsx';

interface PlayerCardProps {
  isCurrentPlayer: boolean;
  player: PlayerType;
  potContribution: number;
}

export default function PlayerCard({ player, isCurrentPlayer, potContribution }: PlayerCardProps) {

  const chipTotal = getChipTotal(player.chips);
  return (
    <li className={clsx('rounded-lg border-1 py-2 px-2',
        {
            'bg-green-300': isCurrentPlayer,
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
      </div>
    </li>
  );
}
