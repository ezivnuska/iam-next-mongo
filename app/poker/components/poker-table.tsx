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
import { StaleGameModal } from './stale-game-modal';
import clsx from 'clsx';

export default function PokerTable() {
  const { players } = usePlayers();
  const { stage, locked, currentPlayerIndex, winner, isLoading, canPlayerAct } = useGameState();
  const { gameId } = useViewers();
  const { joinGame, leaveGame, resetSingleton } = usePokerActions();
  const { user } = useUser();
  const { socket } = useSocket();
  const orientation = useScreenOrientation();

  // Listen for stale game reset from server
  const [showStaleModal, setShowStaleModal] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleStaleReset = () => {
      console.log('[PokerTable] Received stale game reset event from server');
      setShowStaleModal(true);
    };

    socket.on(SOCKET_EVENTS.POKER_GAME_STALE_RESET, handleStaleReset);

    return () => {
      socket.off(SOCKET_EVENTS.POKER_GAME_STALE_RESET, handleStaleReset);
    };
  }, [socket]);

  // Handle reset triggered by stale modal
  const handleStaleReset = () => {
    console.log('[PokerTable] Stale game reset triggered - reloading page');
    // Simply reload the page - the server-side check will have already reset the game
    // This avoids authentication issues with guest users
    window.location.reload();
  };

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
    <div className='flex flex-1 flex-row items-center justify-center max-h-dvh gap-2 relative'>
        <Link href='/' className='absolute top-0 left-0 z-20 p-2'>
            <ArrowLeftIcon className={`h-6 w-6 text-white`} />
        </Link>
        <div className={clsx('flex flex-1 flex-col w-full max-w-[400px] h-dvh min-h-[300px] max-h-[500px] relative', {
            'mx-7 min-h-[320px] max-w-[580px] min-w-[580px]': orientation === 'landscape',
        })}>

            {/* Player slots sidebar */}
            <div className={clsx('flex h-[47%] z-15', {
                'z-5': userGameInfo.isUserInGame,
                'h-[50%]': orientation === 'landscape',
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
            
            {/* <div className={clsx('w-full z-5 border border-green-400', { */}
            <div className={clsx('absolute right-0 bottom-0 left-0 z-5 h-[60%]', {
                'z-15': userGameInfo.isUserInGame,
                'h-[64%]': orientation === 'landscape',
            })}>
                {/* Main table area */}
                {/* <div className='flex flex-1 h-full flex-row items-center justify-center border'> */}
                    <div className={clsx('flex flex-1 h-full flex-col items-center justify-center',
                        // {
                        //     'w-[55%]': orientation === 'landscape',
                        // }
                    )}>
                        <div className={clsx('flex flex-col w-11/12 items-center justify-center py-2', {
                            'w-[60%]': orientation === 'landscape',
                        })}>
                            {/* <div className='absolute -top-7 left-1/2 w-[360px] h-[340px] rounded-full bg-green-800 -translate-x-1/2'> */}
                            <div className='h-9'>
                                <Pot />
                            </div>
                            <PokerDashboard
                                showPlayerControls={showPlayerControls}
                                onActionTaken={handleActionTaken}
                            />
                        </div>
                        <div className='flex flex-1 flex-row items-center'>
                            <CommunalCards />
                        </div>
                    </div>
                {/* </div> */}
            </div>
        </div>
        {gameId && (
            <Button
                onClick={resetSingleton}
                size='sm'
                className='cursor-pointer bg-red-600 hover:bg-red-700 text-white absolute bottom-1 right-1 z-100'
            >
                X
            </Button>
        )}

        {/* Stale game modal */}
        {showStaleModal && <StaleGameModal onResetTriggered={handleStaleReset} />}
    </div>
  );
}
