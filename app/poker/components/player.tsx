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
            'flex rounded-r-full overflow-hidden bg-green-800 relative',
            {
              'bg-green-600 border-2 border-white border-l-0': isCurrentPlayer,
            },
          )}
    >
      {/* Timer progress bar - shown at top when player is taking their turn */}
      {timePercentage > 0 && (
        <div
          className="absolute left-0 top-0 h-full bg-blue-600 transition-all duration-100 ease-linear z-20"
          style={{ width: `${timePercentage}%` }}
          aria-hidden="true"
        />
      )}

      <div
        className='relative z-30 flex flex-1 flex-row gap-1 pl-3 pr-6 py-4 items-center justify-end'
      >
            <div className='flex flex-1 flex-row items-center gap-2 justify-between'>
                <div className='flex flex-1 flex-row gap-4 text-white'>
                    <UserAvatar size={40} username={player.username} />
                    <div id='player-action-status' className='flex flex-col'>
                        <div className='flex flex-row gap-1 items-center'>
                            <span className='text-md'>{player.username}</span>
                            <span className='text-md'>({chipTotal})</span>
                            {isDealer && (
                                <span className='text-xs font-bold px-1.5 py-0.5 rounded bg-yellow-500 text-black'>
                                    D
                                </span>
                            )}
                            {potContribution > 0 && (
                                <span className="text-xs text-gray-700">Pot: ${potContribution}</span>
                            )}
                        </div>
                        {/* Player's active action notification (displays for 2 seconds) */}
                        {activeNotification && (
                            <div className='flex flex-row gap-1 items-center mt-0.5'>
                                <span className='text-xs text-yellow-300 font-semibold'>
                                    {activeNotification.message}
                                </span>
                            </div>
                        )}
                    </div>

                    {player.isAllIn && !winner && (
                        <span className="bg-red-500 text-white px-1.5 py-0.5 rounded text-xs font-bold">
                            ALL-IN
                        </span>
                    )}
                </div>
                {player.hand.length > 0 && <Hand cards={player.hand} hidden={!(isCurrentUser || isWinner)} />}
            </div>
        </div>
    </div>
  );
}
