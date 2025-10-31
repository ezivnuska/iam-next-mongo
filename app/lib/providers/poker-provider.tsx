// app/lib/providers/poker-provider.tsx

'use client';

import { useState, useCallback, ReactNode, useEffect, useMemo, useRef } from 'react';
import type { GameState, Player, Card, Bet, GameStageProps } from '@/app/lib/definitions/poker';
import { useSocket } from './socket-provider';
import { useUser } from './user-provider';
import { SOCKET_EVENTS } from '@/app/lib/socket/events';
import { getChipTotal } from '@/app/lib/utils/poker';
import { calculateCurrentBet } from '@/app/lib/utils/betting-helpers';

// Import modularized code
import {
  GameStateContext,
  PotContext,
  PlayersContext,
  ViewersContext,
  ActionsContext,
  ProcessingContext,
} from './poker/poker-contexts';

import {
  createResetGameState,
  createUpdateGameId,
  createUpdatePlayers,
  createUpdateBettingState,
  createUpdateStageState,
  createUpdateGameStatus,
  createUpdateGameState,
} from './poker/poker-state-updaters';

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
} from './poker/poker-api-actions';

// Import custom hooks
import { useAutoRestart } from './poker/use-auto-restart';
import { usePokerSocketEffects } from './poker/use-poker-socket-effects';

// ============= Provider Component =============

export function PokerProvider({ children }: { children: ReactNode }) {
  const { socket } = useSocket();
  const { user } = useUser();

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

  // --- Computed values ---
  // Calculate how much the current player needs to bet to call
  const currentBet = useMemo(() => {
    return calculateCurrentBet(playerBets, currentPlayerIndex);
  }, [playerBets, currentPlayerIndex]);

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
      setActionHistory
    ),
    [updateGameId, updatePlayers, updateBettingState, updateStageState, updateGameStatus]
  );

  // --- Create API actions ---
  const restart = useCallback(
    createRestartAction(gameId, updateGameState),
    [gameId, updateGameState]
  );
  const joinGame = useCallback(createJoinGameAction(setGameId), []);

  // Wrap placeBet to set processing state
  const placeBetOriginal = useCallback(createPlaceBetAction(gameId), [gameId]);
  const placeBet = useCallback(async (chipCount: number) => {
    if (isActionProcessing || !user?.id) return;

    const actionType = currentBet === 0 ? 'bet' : (chipCount > currentBet ? 'raise' : 'call');
    setIsActionProcessing(true);
    setPendingAction({ type: actionType, playerId: user.id });

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
  }, [placeBetOriginal, isActionProcessing, user, currentBet]);

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

  // Fetch existing games and restore current game on mount
  useEffect(() => {
    const initialize = async () => {
      await initializeGames(setAvailableGames, setGameId, updateGameState);
      setIsLoading(false);
    };
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (winner && stage === 0) setWinner(undefined)
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

  // Socket event handlers
  usePokerSocketEffects({
    socket,
    gameId,
    stateRef,
    updaters: {
      updateGameId,
      updatePlayers,
      updateBettingState,
      updateStageState,
      updateGameStatus,
    },
    resetGameState,
    setAvailableGames,
    setStage,
    setCommunalCards,
    setWinner,
    setActionTimer,
    setActionHistory,
    setIsActionProcessing,
    setPendingAction,
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
  }), [stage, gameStages, locked, lockTime, currentPlayerIndex, currentBet, playerBets, communalCards, deck, winner, actionTimer, restartCountdown, actionHistory, isLoading]);

  const potValue = useMemo(() => {
    // Calculate total pot value
    const potTotal = pot.reduce((total, bet: Bet) => {
      return total + getChipTotal(bet.chips);
    }, 0);

    // Calculate each player's contribution
    const playerContributions: Record<string, number> = {};
    pot.forEach((bet: Bet) => {
      const playerName = bet.player;
      const betValue = getChipTotal(bet.chips);
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
  }), [joinGame, restart, placeBet, fold, leaveGame, deleteGameFromLobby, startTimer, pauseTimer, resumeTimer, clearTimer, setTurnTimerAction, forceLockGame]);

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
} from './poker/poker-hooks';
