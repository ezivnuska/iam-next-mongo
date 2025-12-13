// app/ui/poker/player.tsx

'use client';

import Hand from './player-hand';
import type { Player as PlayerType, PlayerOrientation } from '@/app/games/poker/lib/definitions/poker';
import clsx from 'clsx';
import { useGameState } from '@/app/games/poker/lib/providers/poker-provider';
import { usePlayers } from '@/app/games/poker/lib/providers/poker-hooks';
import UserAvatar from '@/app/ui/user/user-avatar';
import PlayerConnectionStatus from './player-connection-status';
import { useActionTimerPercentage } from '@/app/games/poker/lib/hooks/use-action-timer-percentage';

interface PlayerProps {
  index: number;
  player: PlayerType;
  currentPlayerIndex: number;
  isCurrentUser?: boolean;
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


export default function Player({
    player,
    index,
    currentPlayerIndex,
    isCurrentUser,
    isSmallBlind = false,
    isBigBlind = false,
    mobileOrientation = 'ltr',
    desktopOrientation = 'ltr',
    actionTriggered = false,
}: PlayerProps) {
    const chipTotal = player.chipCount;
    const isCurrentPlayer = index === currentPlayerIndex;
    const { winner, actionTimer, locked } = useGameState();
    const { players } = usePlayers();
    const isWinner = player.id === winner?.winnerId;

    // Check if there's at least one human player
    const hasHumanPlayer = players.some(p => !p.isAI);

    // Timer progress bar - only show for current player
    const timerForCurrentPlayer = isCurrentPlayer ? actionTimer : undefined;
    const timePercentage = useActionTimerPercentage(timerForCurrentPlayer, player.id);

    // Get orientation classes for layout
    const orientationClasses = getOrientationClasses(mobileOrientation, desktopOrientation);

    return (
        <div
            className={clsx(
                'flex flex-col h-full justify-center gap-1 overflow-visible transition-opacity duration-300 relative',
                {
                    'opacity-50': player.isAway || player.folded,
                },
            )}
        >
        
            <div className={clsx('flex flex-row items-center justify-start gap-2 rounded-full bg-black/50 p-1', {
                'bg-black': isCurrentPlayer && (!isCurrentUser || !actionTriggered),
            })}>
                <div className='w-6 h-6'>
                    <UserAvatar username={player.username} isAI={player.isAI} />
                </div>
                <span className='block text-sm text-white text-center'>{player.username}</span>
            </div>
            <div className={clsx(
                'flex flex-1 flex-row justify-center gap-2',
                orientationClasses,
            )}>
                <div className='flex flex-col items-center gap-1'>
                    {player.isAllIn && !winner ? (
                        <span className="text-white px-1.5 py-0.5 bg-red-500 overflow-hidden rounded text-xs font-bold text-center">
                            ALL-IN
                        </span>
                    ) : hasHumanPlayer ? (
                        <span className='text-sm text-white px-1 text-center'>{chipTotal}</span>
                    ) : null}
                    {isSmallBlind && locked && !winner && (
                        <div className='flex flex-row items-center justify-center h-5 w-5 rounded-full bg-blue-500 text-white overflow-hidden'>
                            <span className='text-xs font-bold text-white'>
                                S
                            </span>
                        </div>
                    )}
                    {isBigBlind && locked && !winner && (
                        <div className='flex flex-row items-center justify-center h-5 w-5 rounded-full bg-red-600 text-white overflow-hidden'>
                            <span className='text-xs font-bold text-white'>
                                B
                            </span>
                        </div>
                    )}
                </div>
                <div className='flex flex-1'>
                    {player.hand.length > 0 && !player.folded && (
                        <Hand cards={player.hand} hidden={!(isCurrentUser || winner)} />
                    )}
                </div>
            </div>
        </div>
    );
}

