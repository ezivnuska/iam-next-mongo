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
import PlayerControls from './player-controls-vertical';
import GameNotification from './game-notification';
import SoftHeader from '@/app/ui/header/soft-header';
import { Button } from '@/app/ui/button';

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
    <div className='flex flex-1 flex-col bg-black'>
        <div className='flex flex-row items-center justify-between'>
            <SoftHeader color='white' />
            <div className='flex flex-row items-center px-2 gap-2'>
                {gameId && (
                    <Button
                        onClick={resetSingleton}
                        // variant='outline'
                        size='sm'
                        className='bg-red-600 hover:bg-red-700 text-white'
                    >
                        Reset
                    </Button>
                )}
                {!locked && (
                    <>
                        {userGameInfo.isUserInGame
                            ? <Button size='sm' onClick={leaveGame} className='text-sm'>Leave</Button>
                            : <Button size='sm' onClick={() => gameId && joinGame(gameId)} className='text-sm'>Join</Button>
                        }
                    </>
                )}
                </div>
        </div>

        <div id='poker-table' className='flex flex-1 flex-col sm:flex-row gap-2 rounded-tl-full bg-green-700 p-2'>
            {/* Player slots sidebar */}
            <div id='players' className='flex sm:flex-3 border-1 border-white'>
                <PlayerSlots
                    players={players}
                    locked={locked}
                    currentPlayerIndex={currentPlayerIndex}
                    currentUserId={user?.id}
                    gameId={gameId}
                    onJoinGame={() => gameId && joinGame(gameId)}
                    onLeaveGame={leaveGame}
                />
            </div>
            
            <div className='flex flex-1 sm:flex-4 flex-col shrink-0 items-stretch'>
                <div className='flex flex-1 flex-col h-[60px]'>

                    <div className="flex gap-2">
                        <GameNotification />
                    </div>

                    {/* Game notification - always visible, not just when locked */}
                    {showPlayerControls && (
                        <PlayerControls onActionTaken={handleActionTaken} />
                    )}
                    
                </div>

                {/* Main table area */}
                <div id='table' className='flex w-full flex-col grow items-stretch justify-between border-1 border-white'>

                    <div className='flex flex-1 flex-full flex-col items-stretch justify-between gap-4'>
                        {/* Center area with pot and communal cards */}
                        {/* <div className='flex flex-1 flex-full flex-col sm:flex-row items-center gap-4'> */}
                            <div className='flex flex-1 flex-full flex-row items-center justify-center'>
                                <div className='flex flex-3 flex-full flex-col items-center justify-center gap-4'>
                                    <Pot />
                                    <CommunalCards />
                                </div>
                            </div>
                        {/* </div> */}
                        {/* <div className='flex flex-row flex-1 items-center justify-center'>
                        </div> */}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}
