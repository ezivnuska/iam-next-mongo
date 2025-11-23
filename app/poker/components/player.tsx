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
  isSmallBlind?: boolean;
  isBigBlind?: boolean;
  mobileOrientation?: PlayerOrientation;
  desktopOrientation?: PlayerOrientation;
  actionTriggered?: boolean;
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

/**
 * Get dealer button position classes based on orientation
 */
function getDealerButtonPositionClasses(orientation: PlayerOrientation): string {
    const buttonClass = {
      'ltr': '-right-2 bottom-2',
      'rtl': '-left-2 bottom-2',
      'ttb': '-bottom-5 left-0',
      'btt': 'top-0 left-1/2',
    }[orientation];
  
    return buttonClass
  }

export default function Player({
    player,
    index,
    currentPlayerIndex,
    potContribution,
    isCurrentUser,
    isDealer,
    isSmallBlind = false,
    isBigBlind = false,
    mobileOrientation = 'ltr',
    desktopOrientation = 'ltr',
    actionTriggered = false,
}: PlayerProps) {
    const chipTotal = player.chipCount;
    const isCurrentPlayer = index === currentPlayerIndex;
    const { winner, actionTimer, locked } = useGameState();
    const isWinner = player.id === winner?.winnerId;

    // Timer progress bar - only show for current player
    const timerForCurrentPlayer = isCurrentPlayer ? actionTimer : undefined;
    const timePercentage = useActionTimerPercentage(timerForCurrentPlayer, player.id);

    // Get orientation classes for layout
    const orientationClasses = getOrientationClasses(mobileOrientation, desktopOrientation);
    const buttonClasses = getDealerButtonPositionClasses(mobileOrientation);

    return (
        <div
            className={clsx(
                'flex flex-col justify-center gap-1 overflow-visible transition-opacity duration-300',
                {
                    'opacity-50': player.isAway,
                },
            )}
        >
        
            {/* Avatar section with dealer button and chip count */}
            <span className='inline-block text-sm text-white text-center'>{player.username}</span>
            <div className={clsx(
                'flex justify-center',
                orientationClasses,
            )}>
                <div className='flex flex-col justify-center gap-1'>
                    <div className='flex relative'>
                        <div
                            className={clsx(
                                'rounded-full border-2 relative overflow-visible',
                                {
                                    'border-white': isCurrentPlayer && (!isCurrentUser || !actionTriggered),
                                },
                            )}
                        >
                            <UserAvatar size={28} username={player.username} isAI={player.isAI} />
                        </div>
                        {isSmallBlind && locked && !winner && (
                            <div className='absolute -bottom-1 -right-1 z-21'>
                                <div className='flex flex-row items-center justify-center h-5 w-5 rounded-full bg-blue-500 text-white overflow-hidden border-1'>
                                    <span className='block text-xs font-bold text-white'>
                                        S
                                    </span>
                                </div>
                            </div>
                        )}
                        {isBigBlind && locked && !winner && (
                            <div className='absolute -bottom-1 -right-1 z-22'>
                                <div className='flex flex-row items-center justify-center h-5 w-5 rounded-full bg-red-600 text-white overflow-hidden border-1'>
                                    <span className='text-xs font-bold text-white'>
                                        B
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                    {player.isAllIn && !winner ? (
                        <span className="text-white px-1.5 py-0.5 bg-red-500 overflow-hidden rounded text-xs font-bold text-center">
                            ALL-IN
                        </span>
                    ) : <span className='text-sm text-white px-1 text-center'>{chipTotal}</span>}
                </div>
                <div className='flex relative'>
                    {player.hand.length > 0 && !player.folded && (
                        <Hand cards={player.hand} hidden={!(isCurrentUser || winner)} />
                    )}
                    {isDealer && locked && !winner && (
                        <div className={`absolute z-20 ${buttonClasses}`}>
                            <div className='flex flex-row items-center justify-center h-5 w-5 rounded-full bg-yellow-500 text-black overflow-hidden border-1'>
                                <span className='text-xs font-bold text-black'>
                                    D
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

