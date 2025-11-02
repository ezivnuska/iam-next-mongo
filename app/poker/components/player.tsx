// app/ui/poker/player.tsx

'use client';

import Hand from './hand';
import { getChipTotal } from '@/app/poker/lib/utils/poker';
import type { Player as PlayerType } from '@/app/poker/lib/definitions/poker';
import clsx from 'clsx';
import { useGameState, usePokerActions } from '@/app/poker/lib/providers/poker-provider';
import UserAvatar from '@/app/ui/user/user-avatar';
import { Button } from '@/app/ui/button';
import PlayerConnectionStatus from './player-connection-status';

interface PlayerProps {
  index: number;
  player: PlayerType;
  locked: boolean;
  currentPlayerIndex: number;
  potContribution: number;
  isCurrentUser?: boolean;
  totalPlayers: number;
  onLeaveGame?: () => void;
}

export default function Player({ player, locked, index, currentPlayerIndex, potContribution, isCurrentUser, totalPlayers, onLeaveGame }: PlayerProps) {
  const chipTotal = getChipTotal(player.chips);
  const isCurrentPlayer = index === currentPlayerIndex;
  const { winner } = useGameState();
  const isWinner = player.id === winner?.winnerId;

  return (
    <li
        className={clsx(
            'rounded-xl overflow-hidden bg-green-800',
            {
              'border-2 border-white': isCurrentPlayer,
            },
          )}
    >
      <div
        className={clsx(
          'flex flex-1 flex-row gap-1 px-2 py-1 items-center',
          {
            'bg-green-600': isCurrentPlayer,
          },
        )}
      >
        {/* <div className='flex flex-row sm:flex-col justify-center items-center gap-2 md:gap-0 shrink-0'> */}
            <div className='flex flex-1 flex-row items-center gap-2 justify-between'>
                <div className='flex flex-1 flex-row gap-2 items-center text-white'>
                    <UserAvatar size={44} username={player.username} />
                    <p
                      className={clsx(
                        'flex flex-col shrink self-center items-center justify-center',
                        {
                            'text-green-300' : !isCurrentPlayer,
                        },
                      )}
                    >
                        <div className='flex items-center gap-1.5'>
                            <span className='text-md'>{player.username}</span>
                            {locked && (
                                <PlayerConnectionStatus
                                    playerId={player.id}
                                    lastHeartbeat={player.lastHeartbeat}
                                    isCurrentPlayer={isCurrentPlayer}
                                />
                            )}
                        </div>
                        <span className='text-md'>({chipTotal})</span>
                        {potContribution > 0 && (
                            <span className="text-xs text-gray-700">Pot: ${potContribution}</span>
                        )}
                    </p>
                </div>
                {(isCurrentUser || isWinner) && player.hand.length > 0 && <Hand cards={player.hand} />}
            </div>
        {/* </div> */}
        {isCurrentUser && totalPlayers === 1 && onLeaveGame && (
          <Button size='sm' onClick={onLeaveGame} className="mt-0 md:mt-2 text-sm">
            Leave
          </Button>
        )}
      </div>
    </li>
  );
}
