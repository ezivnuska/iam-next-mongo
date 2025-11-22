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

export default function PokerTable() {
  const { players } = usePlayers();
  const { stage, locked, currentPlayerIndex, winner, isLoading, canPlayerAct } = useGameState();
  const { gameId } = useViewers();
  const { joinGame, leaveGame, resetSingleton } = usePokerActions();
  const { user } = useUser();
  const { socket } = useSocket();

  // Track if an action has been triggered during the current turn
  const [actionTriggered, setActionTriggered] = useState(false);
  const prevIsUserTurnRef = useRef(false);
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

  // Reset actionTriggered when player can act (new turn started AND notifications complete)
  // This only triggers on FALSE→TRUE transition (when turn advances TO the user AND notifications complete)
  useEffect(() => {
    if (canPlayerAct && !prevIsUserTurnRef.current) {
      console.log('[PokerTable] Player can act - resetting actionTriggered');
      setActionTriggered(false);
    }
    prevIsUserTurnRef.current = canPlayerAct;
  }, [canPlayerAct]);

  // Reset actionTriggered when stage changes (new betting round)
  useEffect(() => {
    if (stage !== prevStageRef.current) {
      console.log('[PokerTable] Stage changed - resetting actionTriggered');
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
        console.log('[PokerTable] Timer-triggered action received - hiding controls');
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

  // Log controls visibility changes (hook must be called in consistent order)
  useEffect(() => {
    console.log('[PokerTable] Player controls visibility:', {
      showPlayerControls,
      locked,
      canPlayerAct,
      actionTriggered,
      winner: !!winner,
      stage,
    });
  }, [showPlayerControls, locked, canPlayerAct, actionTriggered, winner, stage]);

  // Callback to notify when action is taken (called immediately on button click)
  const handleActionTaken = () => {
    console.log('[PokerTable] Action taken - hiding controls');
    setActionTriggered(true);
  };

  // Show loading screen while initial data is being fetched
  if (isLoading) {
    return null;
  }

  return (
    <div className='flex flex-1 flex-col bg-black static'>

        <div id='poker-table' className='flex flex-1 flex-col sm:flex-row gap-2 bg-green-700 p-2 relative'>

            <Link href='/' className='absolute top-0 left-0 z-20 p-2'>
                <ArrowLeftIcon className={`h-6 w-6 text-white`} />
            </Link>

            {/* Player slots sidebar */}
            <div className='absolute top-0 left-0 bottom-0 right-0 z-10'>
                <PlayerSlots
                    players={players}
                    locked={locked}
                    currentPlayerIndex={currentPlayerIndex}
                    currentUserId={user?.id}
                    gameId={gameId}
                    onJoinGame={() => gameId && joinGame(gameId)}
                    onLeaveGame={leaveGame}
                    actionTriggered={actionTriggered}
                />
            </div>
            
            <div className='absolute top-0 right-0 bottom-0 left-0 z-15'>

                {/* Main table area */}
                <div id='table' className='flex h-full flex-row items-center sm:items-end justify-center sm:justify-center'>
                    <div className='flex flex-row items-center justify-center gap-2 w-full h-full'>
                        <div className='flex w-full flex-1 flex-col items-center justify-center gap-2'>
                            <div className='flex h-16 flex-row w-full items-end justify-center gap-4'>
                                <Pot />
                            </div>
                            <PokerDashboard
                                showPlayerControls={showPlayerControls}
                                onActionTaken={handleActionTaken}
                                locked={locked}
                                isUserInGame={userGameInfo.isUserInGame}
                                gameId={gameId}
                                joinGame={joinGame}
                            />
                            <CommunalCards />
                        </div>
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
