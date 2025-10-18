// app/ui/poker/player.tsx

'use client';
import Hand from './hand';
import { getChipTotal } from '@/app/lib/utils/poker';
import type { Player as PlayerType } from '@/app/lib/definitions/poker';

interface PlayerProps {
  index: number;
  player: PlayerType;
  playing: boolean;
  currentPlayerIndex: number;
  currentBet: number;
}

export default function Player({ player, playing, index, currentPlayerIndex, currentBet }: PlayerProps) {

  const chipTotal = getChipTotal(player.chips);
  const chipValue = player.chips.length > 0 ? player.chips[0].value : 10;
  const betValue = currentBet * chipValue;

  return (
    <li
        className='rounded-1 border-1 py-2 px-1'
    >
      <div>
        <div className='flex flex-row gap-1 justify-start items-center'>
            <span className="playerName">{player.username}</span>
            <span className="playerChips">({chipTotal})</span>
        </div>
        <Hand cards={player.hand} />
        {playing && currentBet > 0 && (
          <div className='text-sm text-gray-600 mt-1'>
            Bet: {betValue}
          </div>
        )}
      </div>
    </li>
  );
}
