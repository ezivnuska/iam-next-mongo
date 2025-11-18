// app/ui/poker/player.tsx

'use client';

import Hand from './hand';
import { getChipTotal } from '@/app/poker/lib/utils/poker';
import type { Player as PlayerType } from '@/app/poker/lib/definitions/poker';
import clsx from 'clsx';
import { useGameState } from '@/app/poker/lib/providers/poker-provider';
import { usePlayerNotifications } from '@/app/poker/lib/providers/player-notification-provider';
import UserAvatar from '@/app/ui/user/user-avatar';
import PlayerConnectionStatus from './player-connection-status';
import { useActionTimerPercentage } from '@/app/poker/lib/hooks/use-action-timer-percentage';

interface PlayerProps {
  index: number;
  player: PlayerType;
  currentPlayerIndex: number;
  potContribution: number;
  isCurrentUser?: boolean;
  isDealer?: boolean;
}

export default function Player({ player, index, currentPlayerIndex, potContribution, isCurrentUser, isDealer }: PlayerProps) {
    const chipTotal = player.chipCount;
    const isCurrentPlayer = index === currentPlayerIndex;
    const { winner, actionTimer } = useGameState();
    const isWinner = player.id === winner?.winnerId;
    const { getPlayerNotification } = usePlayerNotifications();

    // Timer progress bar - only show for current player
    const timerForCurrentPlayer = isCurrentPlayer ? actionTimer : undefined;
    const timePercentage = useActionTimerPercentage(timerForCurrentPlayer, player.id);

    // Get active notification for this player
    const activeNotification = getPlayerNotification(player.id);

    return (
        <div
            className={clsx(
                'flex flex-row gap-4 h-[90px] overflow-visible p-1 bg-amber-600',
                // 'flex flex-row gap-4 rounded-full overflow-visible bg-green-800 relative px-2 py-2 pr-4',
                // {
                //   'bg-green-600 border-2 border-white': isCurrentPlayer,
                // },
            )}
        >
        
            {/* Timer progress bar - shown at top when player is taking their turn */}
            {/* {timePercentage > 0 && (
                <div
                className="absolute left-0 top-0 h-full rounded-full overflow-hidden bg-blue-600 transition-all duration-100 ease-linear z-20"
                style={{ width: `${timePercentage}%` }}
                aria-hidden="true"
                />
            )} */}

            <div className='flex flex-1 h-full w-full flex-row gap-2 items-stretch justify-center border-1 border-white'>
                <div className='flex flex-full flex-col items-center gap-1'>
                    {/* <div className='absolute top-0 left-0 z-10'> */}
                        <div className='flex flex-col items-center gap-2 p-1 relative'>
                            <div
                                className={clsx(
                                    'rounded-full overflow-hidden border-2',
                                    // 'flex flex-row gap-4 rounded-full overflow-visible bg-green-800 relative px-2 py-2 pr-4',
                                    {
                                        'border-white': isCurrentPlayer,
                                    },
                                )}
                            >
                                <UserAvatar size={36} username={player.username} />
                            </div>

                            {isDealer && (
                                // <div className='absolute top-0 right-0 z-20 rounded-full bg-yellow-500 text-black overflow-hidden'>
                                    <span className='absolute top-0 right-0 z-20 text-xs font-bold px-1.5 py-0.5 rounded-full bg-yellow-500 text-black border'>
                                        D
                                    </span>
                                // </div>
                            )}
                        </div>
                        {player.isAllIn && !winner ? (
                            <span className="text-white px-1.5 py-0.5 bg-red-500 overflow-hidden rounded text-xs font-bold">
                                ALL-IN
                            </span>
                        ) : <span className='text-sm text-white'>({chipTotal})</span>}
                    {/* </div> */}
                </div>
                <div className='flex flex-1 flex-col items-stretch justify-between gap-1'>
                    {/* <span className='text-md'>{player.username}</span> */}
                    {/* Player's active action notification (displays for 2 seconds) */}
                    {/* <div className='h-6'> */}
                        {/* {activeNotification && (
                            <span className='h-6 text-xs text-yellow-300 font-semibold'>
                                {activeNotification.message}
                            </span>
                        )} */}
                    {/* </div> */}
                    <div className='flex h-full'>
                        {player.hand.length > 0 && !player.folded && (
                            <Hand cards={player.hand} hidden={!(isCurrentUser || winner)} />
                        )}
                    </div>
                    
                    {activeNotification && (
                        <span className='text-xs text-yellow-300 font-semibold'>
                            {activeNotification.message}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
}

