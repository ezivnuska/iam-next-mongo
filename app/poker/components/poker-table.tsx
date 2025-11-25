// app/poker/components/poker-table.tsx

'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { usePlayers, useGameState, useViewers, usePokerActions } from '@/app/poker/lib/providers/poker-provider';
import { useUser } from '@/app/lib/providers/user-provider';
import { useSocket } from '@/app/lib/providers/socket-provider';
import { SOCKET_EVENTS } from '@/app/lib/socket/events';
import PlayerSlots from './player-slots';
import CommunalCards from './communal-cards';
import Pot from './pot';
import PokerDashboard from './poker-dashboard';
import { Button } from '@/app/ui/button';
import Link from 'next/link';
import { ArrowLeftIcon } from "@heroicons/react/20/solid";
import { useScreenOrientation } from '../lib/hooks/use-screen-orientation';
import clsx from 'clsx';

export default function PokerTable() {
  const { players } = usePlayers();
  const { stage, locked, currentPlayerIndex, winner, isLoading, canPlayerAct } = useGameState();
  const { gameId } = useViewers();
  const { joinGame, leaveGame, resetSingleton } = usePokerActions();
  const { user } = useUser();
  const { socket } = useSocket();
  const orientation = useScreenOrientation();

  // Track if an action has been triggered during the current turn
  const [actionTriggered, setActionTriggered] = useState(false);
  const prevPlayerIndexRef = useRef(currentPlayerIndex);
  const prevStageRef = useRef(stage);

  // Memoize user-related calculations
  const userGameInfo = useMemo(() => {
    const currentUserPlayerIndex = players.findIndex(p => p.id === user?.id);
    const isUserInGame = currentUserPlayerIndex !== -1;
    const currentPlayer = players[currentPlayerIndex];
    const isUserTurn = currentUserPlayerIndex === currentPlayerIndex && !currentPlayer?.isAI;

    return {
      isUserInGame,
      currentUserPlayerIndex,
      isUserTurn,
    };
  }, [players, user?.id, currentPlayerIndex]);

  // Reset actionTriggered when turn advances to a different player
  // This prevents controls from showing again after action completes but before turn advances
  useEffect(() => {
    if (currentPlayerIndex !== prevPlayerIndexRef.current) {
      setActionTriggered(false);
      prevPlayerIndexRef.current = currentPlayerIndex;
    }
  }, [currentPlayerIndex]);

  // Reset actionTriggered when stage changes (new betting round)
  useEffect(() => {
    if (stage !== prevStageRef.current) {
      setActionTriggered(false);
      prevStageRef.current = stage;
    }
  }, [stage]);

  // Listen for timer-triggered action notifications to hide controls
  useEffect(() => {
    if (!socket || !user?.id) return;

    const handleTimerTriggeredAction = (payload: any) => {
      // Check if this is a timer-triggered action for the current user
      if (payload.timerTriggered && payload.playerId === user.id) {
        setActionTriggered(true);
      }
    };

    socket.on(SOCKET_EVENTS.POKER_NOTIFICATION, handleTimerTriggeredAction);

    return () => {
      socket.off(SOCKET_EVENTS.POKER_NOTIFICATION, handleTimerTriggeredAction);
    };
  }, [socket, user?.id]);

  // Determine if player controls should be shown
  // Only show when it's player's turn AND all notifications have completed
  const showPlayerControls = locked &&
    canPlayerAct &&
    !actionTriggered &&
    !winner &&
    stage < 4; // Hide controls during Showdown (stage 4) and End (stage 5)

  // Callback to notify when action is taken (called immediately on button click)
  const handleActionTaken = () => {
    setActionTriggered(true);
  };

  // Show loading screen while initial data is being fetched
  if (isLoading) {
    return null;
  }

  return (
    <div className='flex flex-1 flex-col h-full gap-2'>
        <div className={clsx('flex flex-1 relative items-end', {
            'mx-7': orientation === 'landscape',
        })}>
            <Link href='/' className='absolute top-0 left-0 z-20 p-2'>
                <ArrowLeftIcon className={`h-6 w-6 text-white`} />
            </Link>

            {/* Player slots sidebar */}
            <div className={clsx('absolute top-0 left-0 bottom-0 right-0 z-15', {
                'z-5': userGameInfo.isUserInGame,
            })}>
                <PlayerSlots
                    players={players}
                    locked={locked}
                    currentPlayerIndex={currentPlayerIndex}
                    currentUserId={user?.id}
                    gameId={gameId}
                    onJoinGame={joinGame}
                    onLeaveGame={leaveGame}
                    actionTriggered={actionTriggered}
                />
            </div>
            
            <div className={clsx('absolute right-0 bottom-0 left-0 z-5', {
                'z-15': userGameInfo.isUserInGame,
                'top-0': orientation === 'portrait',
            })}>
            {/* Main table area */}
                <div className='flex flex-1 h-full w-full flex-row items-end justify-center'>
                    <div className={clsx('flex w-full h-[60%] flex-1 flex-col justify-evenly items-center gap-4',
                        {
                            'h-[60%]': orientation === 'landscape',
                        }
                    )}>
                        <div className='flex flex-col w-full items-center justify-center gap-2'>
                            {/* <div className='flex flex-row w-full items-end justify-center gap-4'> */}
                                <Pot />
                            {/* </div> */}
                            <PokerDashboard
                                showPlayerControls={showPlayerControls}
                                onActionTaken={handleActionTaken}
                            />
                        </div>
                        <CommunalCards />
                    </div>
                </div>
            </div>
            {gameId && (
                <Button
                    onClick={resetSingleton}
                    size='sm'
                    className='cursor-pointer bg-red-600 hover:bg-red-700 text-white absolute bottom-1 right-1 z-100'
                >
                    Reset
                </Button>
            )}
        </div>
    </div>
  );
}
