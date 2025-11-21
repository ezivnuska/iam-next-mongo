// app/ui/poker/player.tsx

'use client';

import Hand from './hand';
import { getChipTotal } from '@/app/poker/lib/utils/poker';
import type { Player as PlayerType, PlayerOrientation } from '@/app/poker/lib/definitions/poker';
import clsx from 'clsx';
import { useGameState } from '@/app/poker/lib/providers/poker-provider';
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
  mobileOrientation?: PlayerOrientation;
  desktopOrientation?: PlayerOrientation;
}

/**
 * Get flex direction classes based on orientation
 * Maps orientation to Tailwind flex classes
 */
function getOrientationClasses(mobileOrientation: PlayerOrientation, desktopOrientation: PlayerOrientation): string {
  const mobileClass = {
    'ltr': 'flex-row',
    'rtl': 'flex-row-reverse',
    'ttb': 'flex-col',
    'btt': 'flex-col-reverse',
  }[mobileOrientation];

  const desktopClass = {
    'ltr': 'sm:flex-row',
    'rtl': 'sm:flex-row-reverse',
    'ttb': 'sm:flex-col',
    'btt': 'sm:flex-col-reverse',
  }[desktopOrientation];

  return `${mobileClass} ${desktopClass}`;
}

export default function Player({
    player,
    index,
    currentPlayerIndex,
    potContribution,
    isCurrentUser,
    isDealer,
    mobileOrientation = 'ltr',
    desktopOrientation = 'ltr',
}: PlayerProps) {
    const chipTotal = player.chipCount;
    const isCurrentPlayer = index === currentPlayerIndex;
    const { winner, actionTimer } = useGameState();
    const isWinner = player.id === winner?.winnerId;

    // Timer progress bar - only show for current player
    const timerForCurrentPlayer = isCurrentPlayer ? actionTimer : undefined;
    const timePercentage = useActionTimerPercentage(timerForCurrentPlayer, player.id);

    // Get orientation classes for layout
    const orientationClasses = getOrientationClasses(mobileOrientation, desktopOrientation);

    return (
        <div
            className={clsx(
                'flex gap-2 overflow-visible p-1 transition-opacity duration-300',
                orientationClasses,
                {
                    'opacity-50': player.isAway,
                },
            )}
        >
        
            {/* Avatar section with dealer button and chip count */}
            <div className='flex flex-col gap-1'>
                <div className='flex flex-row gap-2'>
                    <div className='flex flex-col gap-1 relative'>
                        <div
                            className={clsx(
                                'rounded-full border-2 relative overflow-visible',
                                {
                                    'border-white': isCurrentPlayer,
                                },
                            )}
                        >
                            <UserAvatar size={50} username={player.username} isAI={player.isAI} />
                        </div>

                        {isDealer && (
                            <div className='absolute top-0 right-0 z-20 rounded-full bg-yellow-500 text-black overflow-hidden border-1'>
                                <span className='text-xs font-bold px-1.5 py-0.5 text-black'>
                                    D
                                </span>
                            </div>
                        )}
                        {player.isAllIn && !winner ? (
                            <span className="text-white px-1.5 py-0.5 bg-red-500 overflow-hidden rounded text-xs font-bold text-center">
                                ALL-IN
                            </span>
                        ) : <span className='text-sm text-white px-1 text-center'>{chipTotal}</span>}
                    </div>
                    {player.hand.length > 0 && !player.folded && (
                        <div className='w-[60px]'>
                            <Hand cards={player.hand} hidden={!(isCurrentUser || winner)} />
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
}

