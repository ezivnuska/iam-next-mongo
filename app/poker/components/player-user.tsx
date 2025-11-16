// app/ui/poker/player.tsx

'use client';

import { useEffect } from 'react';
import Hand from './hand';
import type { Player as PlayerType } from '@/app/poker/lib/definitions/poker';
import { useGameState, usePlayers, usePokerActions } from '@/app/poker/lib/providers/poker-provider';
import { useUser } from '@/app/lib/providers/user-provider';
import UserAvatar from '@/app/ui/user/user-avatar';
import { Button } from '@/app/ui/button';
import { useActionTimerPercentage } from '@/app/poker/lib/hooks/use-action-timer-percentage';

interface PlayerUserProps {
  index: number;
  player: PlayerType;
  locked: boolean;
  currentPlayerIndex: number;
  potContribution: number;
  isCurrentUser?: boolean;
  totalPlayers: number;
  isUserTurn: boolean;
  onLeaveGame?: () => void;
}

export default function PlayerUser({
    player,
    locked,
    index,
    currentPlayerIndex,
    potContribution,
    isCurrentUser,
    totalPlayers,
    isUserTurn,
    onLeaveGame,
}: PlayerUserProps) {
  const chipTotal = player.chipCount;
  const isCurrentPlayer = index === currentPlayerIndex;
  const { winner, actionTimer } = useGameState();
  const { leaveGame } = usePokerActions();
  const isWinner = player.id === winner?.winnerId;
  const { players } = usePlayers();
  const { user } = useUser();

  // Timer progress bar - only show for current user
  const timePercentage = useActionTimerPercentage(actionTimer, user?.id);
  
  // Check if current user is in the game
  const isUserInGame = user && players.some(p => p.id === user.id);
  
  // Debug logging for isAllIn status
  useEffect(() => {
    if (player.isAllIn) {
      console.log(`[PlayerUser] Player ${player.username} has isAllIn status:`, {
        isAllIn: player.isAllIn,
        chipCount: player.chipCount,
        allInAmount: player.allInAmount
      });
    }
  }, [player.isAllIn, player.username, player.chipCount, player.allInAmount]);

return (
    <div className='flex flex-col gap-2 justify-between'>
        <div className='relative flex flex-row gap-2 items-center text-white rounded-lg overflow-hidden py-1 px-2 justify-between'>
            <div className='flex flex-row gap-2 items-center text-white'>
                <UserAvatar size={44} username={player.username} />
                <div className='flex flex-row gap-2 sm:flex-col items-center sm:gap-0'>
                    <span className='text-md'>{player.username}</span>
                    <span className='text-md'>({chipTotal})</span>
                    {potContribution > 0 && (
                        <span className="text-xs text-gray-700">Pot: ${potContribution}</span>
                    )}
                </div>

                {/* {player.isAI && (
                    <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded text-xs font-bold">
                        AI
                    </span>
                )} */}
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
            {(isCurrentUser || isWinner) && player.hand.length > 0 && <Hand cards={player.hand} hidden={false} />}
            
            {!locked && isUserInGame && (
                <Button
                    size='sm'
                    onClick={leaveGame}
                    className="bg-white text-blue-700 hover:bg-gray-100 border-0"
                >
                    Leave
                </Button>
            )}
            {/* {isCurrentUser && totalPlayers === 1 && onLeaveGame && (
            <Button size='sm' onClick={onLeaveGame} className="mt-0 md:mt-2 text-sm">
                Leave
            </Button>
            )} */}

            {/* Timer progress bar - absolutely positioned filling full height */}
            {timePercentage > 0 && (
                <div
                    className="absolute left-0 top-0 h-full bg-green-300/30 transition-all duration-100 ease-linear"
                    style={{ width: `${timePercentage}%` }}
                    aria-hidden="true"
                />
            )}
        </div>
    </div>
  );
}
