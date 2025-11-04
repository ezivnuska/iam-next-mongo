// app/ui/poker/player.tsx

'use client';

import { useState, useEffect } from 'react';
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
  const { winner, actionTimer } = useGameState();
  const isWinner = player.id === winner?.winnerId;

  // Timer progress bar state
  const [timePercentage, setTimePercentage] = useState<number>(0);

  // Calculate timer progress percentage for current player
  useEffect(() => {
    // Only show progress bar if this player is the current player and timer is active
    if (!isCurrentPlayer || !actionTimer || actionTimer.isPaused || actionTimer.targetPlayerId !== player.id) {
      setTimePercentage(0);
      return;
    }

    // Calculate initial percentage
    const startTime = new Date(actionTimer.startTime).getTime();
    const calculatePercentage = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      const remaining = Math.max(0, actionTimer.duration - elapsed);
      const percentage = (remaining / actionTimer.duration) * 100;
      return Math.max(0, Math.min(100, percentage));
    };

    setTimePercentage(calculatePercentage());

    // Update percentage every 100ms for smooth animation
    const interval = setInterval(() => {
      const newPercentage = calculatePercentage();
      setTimePercentage(newPercentage);

      // Stop updating when time runs out
      if (newPercentage <= 0) {
        clearInterval(interval);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isCurrentPlayer, actionTimer, player.id]);

  return (
    <li
        className={clsx(
            'rounded-xl overflow-hidden bg-green-800 relative',
            {
              'bg-green-600 border-2 border-white': isCurrentPlayer,
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
        className='relative z-30 flex flex-1 flex-row gap-1 px-2 py-1 items-center'
      >
        {/* <div className='flex flex-row sm:flex-col justify-center items-center gap-2 md:gap-0 shrink-0'> */}
            <div className='flex flex-1 flex-row items-center gap-2 justify-between'>
                <div className='flex flex-row gap-2 items-center text-white'>
                                <UserAvatar size={44} username={player.username} />
                                <div
                                    className={clsx(
                                        'flex flex-col shrink justify-center',
                                        {
                                            'text-green-300' : !isCurrentPlayer,
                                        },
                                    )}
                                >
                                    <div className='flex flex-col items-center'>
                                        <span className='text-md'>{player.username}</span>
                                        <span className='text-md'>({chipTotal})</span>
                                        {potContribution > 0 && (
                                            <span className="text-xs text-gray-700">Pot: ${potContribution}</span>
                                        )}
                                    </div>
                                </div>
                
                                {player.isAllIn && !winner && (
                                    <span className="bg-red-500 text-white px-1.5 py-0.5 rounded text-xs font-bold">
                                        ALL-IN
                                    </span>
                                )}
                                {/* {locked && (
                                    <PlayerConnectionStatus
                                        playerId={player.id}
                                        lastHeartbeat={player.lastHeartbeat}
                                        isCurrentPlayer={isCurrentPlayer}
                                    />
                                )} */}
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
