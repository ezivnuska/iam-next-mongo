// app/lib/providers/poker-provider.tsx

'use client';

import { useState, useCallback, ReactNode, useEffect, useMemo, useRef } from 'react';
import type { GameState, Player, Card, Bet, GameStageProps } from '@/app/poker/lib/definitions/poker';
import { useSocket } from '@/app/lib/providers/socket-provider';
import { useUser } from '@/app/lib/providers/user-provider';
import { SOCKET_EVENTS } from '@/app/lib/socket/events';
import { getChipTotal, createChips } from '@/app/poker/lib/utils/poker';
import { calculateCurrentBet } from '@/app/poker/lib/utils/betting-helpers';

// Import modularized code
import {
  GameStateContext,
  PotContext,
  PlayersContext,
  ViewersContext,
  ActionsContext,
  ProcessingContext,
} from './poker-contexts';

import {
  createResetGameState,
  createUpdateGameId,
  createUpdatePlayers,
  createUpdateBettingState,
  createUpdateStageState,
  createUpdateGameStatus,
  createUpdateGameState,
} from './poker-state-updaters';

import {
  createRestartAction,
  fetchCurrentGame,
  createJoinGameAction,
  createPlaceBetAction,
  createFoldAction,
  createLeaveGameAction,
  createDeleteGameAction,
  createStartTimerAction,
  createPauseTimerAction,
  createResumeTimerAction,
  createClearTimerAction,
  createSetTurnTimerAction,
  createForceLockGameAction,
  initializeGames,
} from './poker-api-actions';

// Import custom hooks
import { useAutoRestart } from './use-auto-restart';
import { usePokerSocketEffects } from './use-poker-socket-effects';
import { usePokerSounds } from '../hooks/use-poker-sounds';
import { usePlayerConnectionMonitor } from '../hooks/use-player-connection-monitor';

// ============= Provider Component =============

export function PokerProvider({ children }: { children: ReactNode }) {
  const { socket } = useSocket();
  const { user } = useUser();
  const { playSound, initSounds } = usePokerSounds();

  // --- Game state (synced from server) ---
  const [players, setPlayers] = useState<Player[]>([]);
  const [deck, setDeck] = useState<Card[]>([]);
  const [communalCards, setCommunalCards] = useState<Card[]>([]);
  const [pot, setPot] = useState<Bet[]>([]);
  const [stage, setStage] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockTime, setLockTime] = useState<string>();
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [playerBets, setPlayerBets] = useState<number[]>([]);
  const [gameStages, setGameStages] = useState<GameStageProps[]>([]);
  const [winner, setWinner] = useState<{
    winnerId: string;
    winnerName: string;
    handRank: string;
    isTie: boolean;
    tiedPlayers?: string[];
  }>();
  const [gameId, setGameId] = useState<string | null>(null);
  const [availableGames, setAvailableGames] = useState<Array<{ id: string; code: string; creatorId: string | null }>>([]);

  // --- Server-synced timer state ---
  const [actionTimer, setActionTimer] = useState<{
    startTime: string;
    duration: number;
    currentActionIndex: number;
    totalActions: number;
    actionType: string;
    targetPlayerId?: string;
    isPaused: boolean;
  }>();
  const [restartCountdown, setRestartCountdown] = useState<number | null>(null);
  const [actionHistory, setActionHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Action processing state ---
  const [isActionProcessing, setIsActionProcessing] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'bet' | 'fold' | 'call' | 'raise';
    playerId: string;
  } | null>(null);

  // --- Game notification state ---
  const [gameNotification, setGameNotification] = useState<{
    id: string;
    message: string;
    type: 'blind' | 'deal' | 'action' | 'info';
    timestamp: number;
    duration?: number;
  } | null>(null);

  // Ref to track current notification for socket handlers
  const gameNotificationRef = useRef<{
    type: string;
    timestamp: number;
    duration: number;
  } | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    if (gameNotification) {
      gameNotificationRef.current = {
        type: gameNotification.type,
        timestamp: gameNotification.timestamp,
        duration: gameNotification.duration || 2000,
      };
    } else {
      gameNotificationRef.current = null;
    }
  }, [gameNotification]);

  // --- Client-side action state (for display purposes) ---
  const [selectedAction, setSelectedAction] = useState<'bet' | 'call' | 'raise' | 'fold' | 'check' | 'allin' | null>(null);

  // --- Computed values ---
  // Calculate how much the current player needs to bet to call
  const currentBet = useMemo(() => {
    return calculateCurrentBet(playerBets, currentPlayerIndex, players);
  }, [playerBets, currentPlayerIndex, players]);

  // Refs to access current state in socket handlers without re-subscribing
  const stateRef = useRef({
    players,
    pot,
    playerBets,
    currentPlayerIndex,
    stage,
    communalCards,
    locked,
    winner,
    gameId
  });

  // Update refs when state changes
  useEffect(() => {
    stateRef.current = {
      players,
      pot,
      playerBets,
      currentPlayerIndex,
      stage,
      communalCards,
      locked,
      winner,
      gameId
    };
  }, [players, pot, playerBets, currentPlayerIndex, stage, communalCards, locked, winner, gameId]);

  // --- Create state updater functions ---
  const resetGameState = useCallback(createResetGameState({
    setGameId,
    setPlayers,
    setDeck,
    setCommunalCards,
    setPot,
    setStage,
    setLocked,
    setLockTime,
    setCurrentPlayerIndex,
    setPlayerBets,
    setGameStages,
    setWinner,
    setActionHistory,
    setActionTimer,
  }), []);

  const updateGameId = useCallback(createUpdateGameId(setGameId), []);
  const updatePlayers = useCallback(createUpdatePlayers(setPlayers), []);
  const updateBettingState = useCallback(
    createUpdateBettingState(setPot, setPlayerBets, setCurrentPlayerIndex),
    []
  );
  const updateStageState = useCallback(
    createUpdateStageState(setStage, setCommunalCards, setDeck, setGameStages),
    []
  );
  const updateGameStatus = useCallback(
    createUpdateGameStatus(setLocked, setLockTime, setWinner),
    []
  );

  const updateGameState = useCallback(
    createUpdateGameState(
      updateGameId,
      updatePlayers,
      updateBettingState,
      updateStageState,
      updateGameStatus,
      setActionHistory,
      setActionTimer
    ),
    [updateGameId, updatePlayers, updateBettingState, updateStageState, updateGameStatus]
  );

  // --- Create API actions ---
  const restart = useCallback(
    createRestartAction(gameId, updateGameState),
    [gameId, updateGameState]
  );
  const joinGame = useCallback(createJoinGameAction(setGameId), []);

  // Wrap placeBet to set processing state and update optimistically
  const placeBetOriginal = useCallback(createPlaceBetAction(gameId), [gameId]);
  const placeBet = useCallback(async (chipCount: number) => {
    if (isActionProcessing || !user?.id) return;

    const actionType = currentBet === 0 ? 'bet' : (chipCount > currentBet ? 'raise' : 'call');
    setIsActionProcessing(true);
    setPendingAction({ type: actionType, playerId: user.id });

    // Find current player's username
    const currentPlayer = players.find(p => p.id === user.id);
    if (!currentPlayer) {
      console.error('Current player not found');
      return;
    }

    // Optimistically update pot and playerBets on acting client
    if (chipCount > 0) {
      setPot(prevPot => [
        ...prevPot,
        {
          player: currentPlayer.username,
          chipCount: chipCount
        }
      ]);

      // Update playerBets to reflect this bet
      setPlayerBets(prevBets => {
        const newBets = [...prevBets];
        const playerIndex = players.findIndex(p => p.id === user.id);
        if (playerIndex !== -1) {
          newBets[playerIndex] = (newBets[playerIndex] || 0) + chipCount;
        }
        return newBets;
      });
    }

    // Set timeout to clear processing state if no response after 5 seconds
    const timeoutId = setTimeout(() => {
      setIsActionProcessing(false);
      setPendingAction(null);
      console.warn('Action timeout: No response from server');
    }, 5000);

    try {
      await placeBetOriginal(chipCount);
    } catch (error) {
      clearTimeout(timeoutId);
      setIsActionProcessing(false);
      setPendingAction(null);
      console.error('Error placing bet:', error);
    }
  }, [placeBetOriginal, isActionProcessing, user, currentBet, players]);

  // Wrap fold to set processing state
  const foldOriginal = useCallback(createFoldAction(gameId), [gameId]);
  const fold = useCallback(async () => {
    if (isActionProcessing || !user?.id) return;

    setIsActionProcessing(true);
    setPendingAction({ type: 'fold', playerId: user.id });

    // Set timeout to clear processing state if no response after 5 seconds
    const timeoutId = setTimeout(() => {
      setIsActionProcessing(false);
      setPendingAction(null);
      console.warn('Action timeout: No response from server');
    }, 5000);

    try {
      await foldOriginal();
    } catch (error) {
      clearTimeout(timeoutId);
      setIsActionProcessing(false);
      setPendingAction(null);
      console.error('Error folding:', error);
    }
  }, [foldOriginal, isActionProcessing, user]);
  const leaveGame = useCallback(
    createLeaveGameAction(gameId, resetGameState, setAvailableGames),
    [gameId, resetGameState]
  );
  const deleteGameFromLobby = useCallback(
    createDeleteGameAction(setAvailableGames),
    []
  );
  const startTimer = useCallback(createStartTimerAction(gameId), [gameId]);
  const pauseTimer = useCallback(createPauseTimerAction(gameId), [gameId]);
  const resumeTimer = useCallback(createResumeTimerAction(gameId), [gameId]);
  const clearTimer = useCallback(createClearTimerAction(gameId), [gameId]);
  const setTurnTimerAction = useCallback(createSetTurnTimerAction(gameId), [gameId]);
  const forceLockGame = useCallback(createForceLockGameAction(gameId), [gameId]);

  // Optimistically clear timer locally without waiting for server
  const clearTimerOptimistically = useCallback(() => {
    console.log('[PokerProvider] Clearing timer optimistically');
    setActionTimer(undefined);
  }, []);

  // Fetch existing games and restore current game on mount
  useEffect(() => {
    const initialize = async () => {
      await initializeGames(setAvailableGames, setGameId, updateGameState);
      // Initialize sound effects
      await initSounds();
      setIsLoading(false);
    };
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check for expired timers when actionTimer changes or on mount
  useEffect(() => {
    if (!actionTimer || !gameId || actionTimer.isPaused) return;

    // Calculate if timer has expired
    const startTime = new Date(actionTimer.startTime).getTime();
    const elapsed = (Date.now() - startTime) / 1000;
    const remaining = actionTimer.duration - elapsed;

    // If timer has expired, call the check API to execute the action
    if (remaining <= 0) {
      const checkExpiredTimer = async () => {
        try {
          await fetch('/api/poker/timer/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ gameId }),
          });
        } catch (error) {
          console.error('Error checking expired timer:', error);
        }
      };
      checkExpiredTimer();
    }
  }, [actionTimer, gameId]);

  useEffect(() => {
    // Clear winner when returning to preflop stage
    if (winner && stage === 0) setWinner(undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])

  // Schedule auto-restart when game ends (winner determined)
  // Only winner's client will trigger restart to prevent concurrent requests
  useAutoRestart({
    winner,
    onRestart: restart,
    setCountdown: setRestartCountdown,
    duration: 30000, // 30 seconds
    currentUserId: user?.id,
    players,
  });

  // Monitor player connection status
  // DISABLED: Connection monitor was disrupting normal game flow
  // const isUserInGame = user && players.some(p => p.id === user.id);
  // const isMyTurn = user && players[currentPlayerIndex]?.id === user.id;

  // usePlayerConnectionMonitor({
  //   gameId,
  //   isUserInGame: !!isUserInGame,
  //   isMyTurn: !!isMyTurn,
  //   onDisconnect: () => {
  //     console.log('You disconnected from the game');
  //   },
  //   onReconnect: async () => {
  //     console.log('You reconnected to the game');
  //     // Refresh game state when reconnecting
  //     if (gameId) {
  //       const freshGameState = await fetchCurrentGame();
  //       if (freshGameState) {
  //         updateGameState(freshGameState);
  //       }
  //     }
  //   },
  // });

  // Memoize updaters object to prevent socket handlers from re-registering on every render
  const updaters = useMemo(() => ({
    updateGameId,
    updatePlayers,
    updateBettingState,
    updateStageState,
    updateGameStatus,
  }), [updateGameId, updatePlayers, updateBettingState, updateStageState, updateGameStatus]);

  // Socket event handlers
  usePokerSocketEffects({
    socket,
    gameId,
    userId: user?.id,
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
    setGameNotification,
    playSound,
    gameNotificationRef,
    setCurrentPlayerIndex,
  });

  // --- Memoized context values ---
  const gameStateValue = useMemo(() => ({
    stage,
    stages: gameStages,
    locked,
    lockTime,
    currentPlayerIndex,
    currentBet,
    playerBets,
    communalCards,
    deck,
    winner,
    actionTimer,
    restartCountdown,
    actionHistory,
    isLoading,
    gameNotification,
    selectedAction,
    setSelectedAction,
  }), [stage, gameStages, locked, lockTime, currentPlayerIndex, currentBet, playerBets, communalCards, deck, winner, actionTimer, restartCountdown, actionHistory, isLoading, gameNotification, selectedAction]);

  const potValue = useMemo(() => {
    // Calculate total pot value
    const potTotal = pot.reduce((total, bet: Bet) => {
      return total + bet.chipCount;
    }, 0);

    // Calculate each player's contribution
    const playerContributions: Record<string, number> = {};
    pot.forEach((bet: Bet) => {
      const playerName = bet.player;
      const betValue = bet.chipCount;
      playerContributions[playerName] = (playerContributions[playerName] || 0) + betValue;
    });

    return {
      pot,
      potTotal,
      playerContributions,
    };
  }, [pot]);

  const playersValue = useMemo(() => ({
    players,
  }), [players]);

  const viewersValue = useMemo(() => ({
    gameId,
    availableGames,
  }), [gameId, availableGames]);

  const actionsValue = useMemo(() => ({
    joinGame,
    restart,
    placeBet,
    fold,
    leaveGame,
    deleteGameFromLobby,
    fetchCurrentGame,
    startTimer,
    pauseTimer,
    resumeTimer,
    clearTimer,
    setTurnTimerAction,
    forceLockGame,
    clearTimerOptimistically,
    playSound,
  }), [joinGame, restart, placeBet, fold, leaveGame, deleteGameFromLobby, startTimer, pauseTimer, resumeTimer, clearTimer, setTurnTimerAction, forceLockGame, clearTimerOptimistically, playSound]);

  const processingValue = useMemo(() => ({
    isActionProcessing,
    pendingAction,
  }), [isActionProcessing, pendingAction]);

  return (
    <GameStateContext.Provider value={gameStateValue}>
      <PotContext.Provider value={potValue}>
        <PlayersContext.Provider value={playersValue}>
          <ViewersContext.Provider value={viewersValue}>
            <ActionsContext.Provider value={actionsValue}>
              <ProcessingContext.Provider value={processingValue}>
                {children}
              </ProcessingContext.Provider>
            </ActionsContext.Provider>
          </ViewersContext.Provider>
        </PlayersContext.Provider>
      </PotContext.Provider>
    </GameStateContext.Provider>
  );
}

// Re-export hooks for convenience
export {
  useGameState,
  usePot,
  usePlayers,
  useViewers,
  usePokerActions,
  useProcessing,
  usePoker,
} from './poker-hooks';
