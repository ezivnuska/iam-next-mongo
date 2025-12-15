// app/poker/components/poker-table.tsx

'use client';

import { useMemo, useState, useRef, useEffect } from 'react';
import { usePlayers, useGameState, useViewers, usePokerActions } from '@/app/games/poker/lib/providers/poker-provider';
import { useUser, createGuestUser } from '@/app/lib/providers/user-provider';
import { useSocket } from '@/app/lib/providers/socket-provider';
import { SOCKET_EVENTS } from '@/app/lib/socket/events';
import type { User } from '@/app/lib/definitions';
import { UserRole } from '@/app/lib/definitions/user';
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
  const { user, status, setUser } = useUser();
  const { socket } = useSocket();
  const orientation = useScreenOrientation();

  // Restore guest user from localStorage on page load (for reconnection after refresh)
  // Use state to track restoration status to prevent rendering until complete
  const [guestRestorationComplete, setGuestRestorationComplete] = useState(false);

  useEffect(() => {
    // Only attempt restoration if not authenticated
    if (status !== 'unauthenticated') {
      // If authenticated, mark as complete immediately
      if (status === 'authenticated') {
        setGuestRestorationComplete(true);
      }
      return;
    }

    // Skip if user is already set (already authenticated or guest already restored)
    if (user) {
      setGuestRestorationComplete(true);
      return;
    }

    try {
      const storedGuestId = localStorage.getItem('poker_guest_id');
      const storedGuestUsername = localStorage.getItem('poker_guest_username');
      const storedCreatedAt = localStorage.getItem('poker_guest_created_at');

      if (storedGuestId && storedGuestUsername) {
        // Check if credentials have expired (30 days)
        const EXPIRATION_DAYS = 30;
        const isExpired = storedCreatedAt
          ? (Date.now() - new Date(storedCreatedAt).getTime()) > (EXPIRATION_DAYS * 24 * 60 * 60 * 1000)
          : false;

        if (isExpired) {
          localStorage.removeItem('poker_guest_id');
          localStorage.removeItem('poker_guest_username');
          localStorage.removeItem('poker_guest_created_at');
          setGuestRestorationComplete(true);
          return;
        }

        // Create guest user object directly without generating new ID
        const guestUser: User = {
          id: storedGuestId,
          username: storedGuestUsername,
          email: '',
          role: UserRole.User,
          bio: '',
          avatar: null,
          verified: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isGuest: true,
        };

        setUser(guestUser);
      }

      // Mark restoration as complete regardless of whether credentials existed
      setGuestRestorationComplete(true);
    } catch (e) {
      console.warn('[PokerTable] Failed to restore guest user from localStorage:', e);
      setGuestRestorationComplete(true);
    }
  }, [status, user, setUser]);

  // Listen for stale game reset from server
  const [showStaleModal, setShowStaleModal] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handleStaleReset = () => {
      setShowStaleModal(true);
    };

    socket.on(SOCKET_EVENTS.POKER_GAME_STALE_RESET, handleStaleReset);

    return () => {
      socket.off(SOCKET_EVENTS.POKER_GAME_STALE_RESET, handleStaleReset);
    };
  }, [socket]);

  // Handle reset triggered by stale modal
  const handleStaleReset = () => {
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

  // Show loading screen while initial data is being fetched or guest user is being restored
  // This prevents race conditions where game state renders before user is restored
  if (isLoading || !guestRestorationComplete) {
    return null;
  }

  return (
    <div className='flex flex-1 flex-row items-start justify-center max-h-dvh gap-2 relative'>
        <Link href='/games' className='absolute top-0 left-0 z-20 p-2'>
            <ArrowLeftIcon className={`h-6 w-6 text-white`} />
        </Link>
        <div className={clsx('flex flex-1 flex-col w-full max-w-[500px] h-dvh min-h-[300px] relative', {
            'mx-7 min-h-[320px] max-w-[580px] min-w-[580px]': orientation === 'landscape',
        })}>

            {/* Player slots sidebar */}
            <div className={clsx('flex flex-1 z-15', {
                'z-5': userGameInfo.isUserInGame,
                'max-h-[44%]': orientation === 'landscape',
            })}>
                <PlayerSlots
                    players={players}
                    locked={locked}
                    currentPlayerIndex={currentPlayerIndex}
                    currentUser={user}
                    gameId={gameId}
                    onJoinGame={joinGame}
                    onLeaveGame={leaveGame}
                    actionTriggered={actionTriggered}
                />
            </div>
            
            {/* Main table area */}
            <div className={clsx('absolute right-0 bottom-0 left-0 z-5 h-[53%]', {
                'z-15': userGameInfo.isUserInGame,
                'h-[64%]': orientation === 'landscape',
            })}>
                <div className='flex flex-1 h-full flex-col items-center justify-center'>
                    <div className={clsx('flex flex-col w-11/12 items-center justify-center py-2', {
                        'w-[60%]': orientation === 'landscape',
                    })}>
                        <Pot />
                        <PokerDashboard
                            showPlayerControls={showPlayerControls}
                            onActionTaken={handleActionTaken}
                        />
                    </div>
                    <div className='flex flex-1 flex-row items-center'>
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
                X
            </Button>
        )}

        {/* Stale game modal */}
        {showStaleModal && <StaleGameModal onResetTriggered={handleStaleReset} />}
    </div>
  );
}
