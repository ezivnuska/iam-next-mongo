// app/ui/poker/player.tsx

'use client';

import PlayerCard from './player-card';
import Hand from './hand';
import { getChipTotal } from '@/app/lib/utils/poker';
import type { Player as PlayerType } from '@/app/lib/definitions/poker';
import clsx from 'clsx';
import { Button } from '../button';
import { usePokerActions } from '@/app/lib/providers/poker-provider';
import UserAvatar from '../user/user-avatar';

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
    <li className={clsx('flex flex-1 rounded-lg border-1 py-2 px-2 bg-white',
        {
            'bg-green-300': currentPlayerIndex === index,
        },
    )}>
      <div className='flex flex-1 flex-row sm:flex-col gap-2 items-center sm:justify-between'>
        <div className='flex flex-row sm:flex-col justify-center items-center gap-2 md:gap-0 flex-shrink-0'>
            <div className='flex flex-col items-center gap-1'>
                <UserAvatar size={50} username={player.username} />
                <div className='flex flex-row flex-wrap bg-amber-300 self-center items-center justify-center gap-1'>
                    <span className="border-1">{player.username}</span>
                    <span className="border-1">({chipTotal})</span>
                    {potContribution > 0 && (
                        <span className="text-xs text-gray-700">Pot: ${potContribution}</span>
                    )}
                </div>
            </div>
        </div>
        {player.hand.length > 0 && <Hand cards={player.hand} />}
        {isCurrentUser && !locked && onLeaveGame && (
          <Button size='sm' onClick={onLeaveGame} className="mt-0 md:mt-2 text-sm">
            Leave
          </Button>
        )}
      </div>
    </li>
  );
}
