// app/ui/poker/player.tsx

'use client';

import { useState, useEffect, useRef } from 'react';
import Hand from './hand';
import { getChipTotal } from '@/app/poker/lib/utils/poker';
import type { Player as PlayerType } from '@/app/poker/lib/definitions/poker';
import clsx from 'clsx';
import { useGameState, usePokerActions, useProcessing } from '@/app/poker/lib/providers/poker-provider';
import { useUser } from '@/app/lib/providers/user-provider';
import UserAvatar from '@/app/ui/user/user-avatar';
import { Button } from '@/app/ui/button';
import PlayerConnectionStatus from './player-connection-status';
import PlayerControls from './player-controls';
import NotificationArea from './notification-area';

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
  const chipTotal = getChipTotal(player.chips);
  const isCurrentPlayer = index === currentPlayerIndex;
  const { winner, actionTimer } = useGameState();
  const isWinner = player.id === winner?.winnerId;
  const { isActionProcessing, pendingAction } = useProcessing();
  const { user } = useUser();

  // Track if an action has been triggered during the current turn
  const [actionTriggered, setActionTriggered] = useState(false);
  const prevIsUserTurnRef = useRef(isUserTurn);

  // Timer progress bar state
  const [timePercentage, setTimePercentage] = useState<number>(0);

  // Reset actionTriggered when it becomes the user's turn (new turn started)
  useEffect(() => {
    // When isUserTurn changes from false to true, it's a new turn for the user
    if (isUserTurn && !prevIsUserTurnRef.current) {
      setActionTriggered(false);
    }
    prevIsUserTurnRef.current = isUserTurn;
  }, [isUserTurn]);

  // Calculate timer progress percentage for current user
  useEffect(() => {
    // Reset percentage if timer is not active or not for this user
    if (!actionTimer || actionTimer.isPaused || actionTimer.targetPlayerId !== user?.id) {
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
  }, [actionTimer, user?.id]);

  // Callback to notify when action is taken (called immediately on button click)
  const handleActionTaken = () => {
    setActionTriggered(true);
  };

  // Debug logging for isAllIn status
  useEffect(() => {
    if (player.isAllIn) {
      console.log(`[PlayerUser] Player ${player.username} has isAllIn status:`, {
        isAllIn: player.isAllIn,
        chips: player.chips.length,
        allInAmount: player.allInAmount
      });
    }
  }, [player.isAllIn, player.username, player.chips.length, player.allInAmount]);

  // Check if current user has a pending action being processed
  const isProcessingUserAction = isActionProcessing && pendingAction?.playerId === player.id;

  // Map action types to display text
  const getActionDisplayText = (actionType: string): string => {
    switch (actionType) {
      case 'bet':
        return 'Betting';
      case 'call':
        return 'Calling';
      case 'raise':
        return 'Raising';
      case 'fold':
        return 'Folding';
      default:
        return 'Processing';
    }
  };

return (
    <div className='flex flex-col gap-2 justify-between'>
        <div className='relative flex flex-row gap-2 items-center text-white rounded-lg overflow-hidden py-1 px-2 justify-between'>
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
            {isCurrentUser && totalPlayers === 1 && onLeaveGame && (
            <Button size='sm' onClick={onLeaveGame} className="mt-0 md:mt-2 text-sm">
                Leave
            </Button>
            )}

            {/* Timer progress bar - absolutely positioned filling full height */}
            {timePercentage > 0 && (
                <div
                    className="absolute left-0 top-0 h-full bg-green-300/30 transition-all duration-100 ease-linear"
                    style={{ width: `${timePercentage}%` }}
                    aria-hidden="true"
                />
            )}
        </div>
        {/* Player controls or notification area */}
        {isUserTurn && locked && player.hand.length > 0 && !winner && !actionTriggered ? (
            <PlayerControls onActionTaken={handleActionTaken} />
        ) : (
            <NotificationArea />
        )}
    </div>
  );
}
