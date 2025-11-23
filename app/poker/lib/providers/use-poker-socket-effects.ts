// app/lib/providers/poker/use-poker-socket-effects.ts

'use client';

import { useEffect } from 'react';
import type { Socket } from 'socket.io-client';
import { SOCKET_EVENTS } from '@/app/lib/socket/events';
import type { Player, Card } from '@/app/poker/lib/definitions/poker';

import {
  createStateUpdateHandler,
  createGameCreatedHandler,
  createGameDeletedHandler,
  createPlayerJoinedHandler,
  createPlayerLeftHandler,
  createPlayerPresenceUpdatedHandler,
  createGameLockedHandler,
  createGameUnlockedHandler,
  createBetPlacedHandler,
  createCardsDealtHandler,
  createRoundCompleteHandler,
  createDealerButtonMovedHandler,
  createTimerStartedHandler,
  createTimerPausedHandler,
  createTimerResumedHandler,
  createTimerClearedHandler,
  registerSocketHandlers,
  type GameStateSnapshot,
  type StateUpdaters,
} from './poker-socket-handlers';
import type { PokerSoundType } from '../hooks/use-poker-sounds';
import type { NotificationType } from './notification-provider';

/**
 * Dependencies required for socket effects
 */
export interface PokerSocketEffectsDeps {
  socket: Socket | null;
  gameId: string | null;
  userId: string | null | undefined;
  user: any;
  setUser: (user: any) => void;
  stateRef: React.MutableRefObject<GameStateSnapshot>;
  updaters: StateUpdaters;
  resetGameState: () => void;
  setAvailableGames: React.Dispatch<React.SetStateAction<Array<{ id: string; code: string; creatorId: string | null }>>>;
  setStage: (stage: number) => void;
  setCommunalCards: (cards: Card[]) => void;
  setWinner: (winner: any) => void;
  setActionTimer: React.Dispatch<React.SetStateAction<any>>;
  setActionHistory: (history: any[]) => void;
  setIsActionProcessing: (processing: boolean) => void;
  setPendingAction: (action: { type: 'bet' | 'fold' | 'call' | 'raise'; playerId: string } | null) => void;
  setAutoAdvanceMode: (mode: boolean) => void;
  playSound: (sound: PokerSoundType) => void;
  setCurrentPlayerIndex: (index: number) => void;
  setDealerButtonPosition: (position: number) => void;
  showNotification?: (notification: { message: string; type: NotificationType; duration: number; onComplete?: () => void; metadata?: any }) => void;
  clearAllPlayerNotifications?: () => void;
}

/**
 * Custom hook to manage all poker socket event handlers
 *
 * This hook:
 * - Registers all socket event listeners
 * - Creates handlers for game state updates, bets, cards, timers, etc.
 * - Cleans up listeners on unmount
 * - Re-registers when dependencies change
 *
 * @param deps - All dependencies needed for socket handlers
 *
 * @example
 * ```tsx
 * usePokerSocketEffects({
 *   socket,
 *   gameId,
 *   stateRef,
 *   updaters: {
 *     updateGameId,
 *     updatePlayers,
 *     updateBettingState,
 *     updateStageState,
 *     updateGameStatus,
 *   },
 *   resetGameState,
 *   setAvailableGames,
 *   setStage,
 *   setCommunalCards,
 *   setWinner,
 *   setActionTimer,
 * });
 * ```
 */
export function usePokerSocketEffects(deps: PokerSocketEffectsDeps) {
  const {
    socket,
    gameId,
    userId,
    user,
    setUser,
    stateRef,
    updaters,
    resetGameState,
    setAvailableGames,
    setStage,
    setCommunalCards,
    setWinner,
    setActionTimer,
    setActionHistory,
    setIsActionProcessing,
    setPendingAction,
    setAutoAdvanceMode,
    playSound,
    setCurrentPlayerIndex,
    setDealerButtonPosition,
    showNotification,
    clearAllPlayerNotifications,
  } = deps;

  useEffect(() => {
    if (!socket) return;

    const handleConnect = () => {
      // Socket connected
    };

    const handleDisconnect = () => {
      // Socket disconnected
    };

    // Create all socket event handlers
    const handleStateUpdate = createStateUpdateHandler({
      stateRef,
      updaters,
      gameId,
      resetGameState,
      setAvailableGames,
      setStage,
      setCommunalCards,
      setWinner,
      setActionTimer,
      setActionHistory,
      setIsActionProcessing,
      setPendingAction,
      setAutoAdvanceMode,
      playSound,
      userId,
      user,
      setUser,
    });

    const handleGameCreated = createGameCreatedHandler(setAvailableGames);
    const handleGameDeleted = createGameDeletedHandler(gameId, resetGameState, setAvailableGames);
    const handlePlayerJoined = createPlayerJoinedHandler(updaters.updatePlayers, setActionHistory, updaters.updateGameStatus);
    const handlePlayerLeft = createPlayerLeftHandler(updaters.updatePlayers, updaters.updateGameStatus, setActionHistory, playSound, userId);
    const handlePlayerPresenceUpdated = createPlayerPresenceUpdatedHandler(updaters.updatePlayers, () => stateRef.current.players);
    const handleGameLocked = createGameLockedHandler(updaters.updatePlayers, updaters.updateGameStatus, setStage, updaters.updateBettingState, setActionHistory, playSound);
    const handleGameUnlocked = createGameUnlockedHandler(updaters.updateGameStatus, setStage, setDealerButtonPosition);
    const handleBetPlaced = createBetPlacedHandler(updaters.updateBettingState, setActionHistory, setIsActionProcessing, setPendingAction, playSound, updaters.updatePlayers, userId);

    const handleCardsDealt = createCardsDealtHandler(updaters.updateStageState, updaters.updatePlayers, playSound, setCurrentPlayerIndex);
    const handleRoundComplete = createRoundCompleteHandler(setWinner, updaters.updatePlayers, playSound, showNotification, gameId);
    const handleDealerButtonMoved = createDealerButtonMovedHandler(setDealerButtonPosition);
    const handleTimerStarted = createTimerStartedHandler(setActionTimer);
    const handleTimerPaused = createTimerPausedHandler(setActionTimer);
    const handleTimerResumed = createTimerResumedHandler(setActionTimer);
    const handleTimerCleared = createTimerClearedHandler(setActionTimer);

    // Register all socket handlers
    const cleanup = registerSocketHandlers(
      socket,
      {
        handleConnect,
        handleDisconnect,
        handleStateUpdate,
        handleGameCreated,
        handleGameDeleted,
        handlePlayerJoined,
        handlePlayerLeft,
        handlePlayerPresenceUpdated,
        handleGameLocked,
        handleGameUnlocked,
        handleBetPlaced,
        handleCardsDealt,
        handleRoundComplete,
        handleDealerButtonMoved,
        handleTimerStarted,
        handleTimerPaused,
        handleTimerResumed,
        handleTimerCleared,
      },
      SOCKET_EVENTS
    );

    return cleanup;
  }, [
    socket,
    gameId,
    stateRef,
    updaters,
    resetGameState,
    setAvailableGames,
    setStage,
    setCommunalCards,
    setWinner,
    setActionTimer,
    setActionHistory,
    setIsActionProcessing,
    setPendingAction,
    playSound,
    setCurrentPlayerIndex,
    setDealerButtonPosition,
  ]);
}
