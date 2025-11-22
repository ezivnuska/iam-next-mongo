// app/lib/providers/poker-provider.tsx

'use client';

import { useState, useCallback, ReactNode, useEffect, useMemo, useRef } from 'react';
import type { GameState, Player, Card, Bet, GameStageProps } from '@/app/poker/lib/definitions/poker';
import { useSocket } from '@/app/lib/providers/socket-provider';
import { useUser } from '@/app/lib/providers/user-provider';
import { SOCKET_EVENTS } from '@/app/lib/socket/events';
import { getChipTotal } from '@/app/poker/lib/utils/poker';
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
  createJoinGameAction,
  createPlaceBetAction,
  createFoldAction,
  createLeaveGameAction,
  createDeleteGameAction,
  createSetTurnTimerAction,
  createSetPresenceAction,
  createResetSingletonAction,
  initializeGames,
} from './poker-api-actions';

// Import custom hooks
import { usePokerSocketEffects } from './use-poker-socket-effects';
import { usePokerSounds } from '../hooks/use-poker-sounds';
import { usePlayerConnectionMonitor } from '../hooks/use-player-connection-monitor';
import { NotificationProvider, useNotifications } from './notification-provider';
import { PlayerNotificationProvider, usePlayerNotifications } from './player-notification-provider';
import { useStageCoordinator } from '../hooks/use-stage-coordinator';

// ============= Inner Provider Component (with NotificationProvider access) =============

function PokerProviderInner({ children }: { children: ReactNode }) {
  const { socket } = useSocket();
  const { user, setUser } = useUser();
  const { playSound, initSounds } = usePokerSounds();
  const { isActionNotificationActive } = useNotifications();

  // --- Game state (synced from server) ---
  const [gameId, setGameId] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [deck, setDeck] = useState<Card[]>([]);
  const [communalCards, setCommunalCards] = useState<Card[]>([]);
  const [pot, setPot] = useState<Bet[]>([]);
  const [stage, setStage] = useState(0);
  const [locked, setLocked] = useState(false);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [dealerButtonPosition, setDealerButtonPosition] = useState(0);
  const [playerBets, setPlayerBets] = useState<number[]>([]);
  const [gameStages, setGameStages] = useState<GameStageProps[]>([]);
  const [autoAdvanceMode, setAutoAdvanceMode] = useState(false);
  const [winner, setWinner] = useState<{
    winnerId: string;
    winnerName: string;
    handRank: string;
    isTie: boolean;
    tiedPlayers?: string[];
  }>();
  const [availableGames, setAvailableGames] = useState<Array<{ id: string; code: string; creatorId: string | null }>>([]);

  // Stage coordination - delays stage updates until notifications complete
  // This must be inside NotificationProvider
  const { applyStageUpdate, resetCoordinator } = useStageCoordinator(gameId, playSound);
  const { resetNotifications, showNotification } = useNotifications();
  const { showPlayerNotification, clearAllPlayerNotifications } = usePlayerNotifications();

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
  const [actionHistory, setActionHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- Action processing state ---
  const [isActionProcessing, setIsActionProcessing] = useState(false);
  const [pendingAction, setPendingAction] = useState<{
    type: 'bet' | 'fold' | 'call' | 'raise';
    playerId: string;
  } | null>(null);

  // --- Client-side action state (for display purposes) ---
  const [selectedAction, setSelectedAction] = useState<'bet' | 'call' | 'raise' | 'fold' | 'check' | 'allin' | null>(null);

  // --- Computed values ---
  // Calculate how much the current player needs to bet to call
  const currentBet = useMemo(() => {
    return calculateCurrentBet(playerBets, currentPlayerIndex, players);
  }, [playerBets, currentPlayerIndex, players]);

  // Determine if the current user can act (it's their turn AND notifications are complete)
  const canPlayerAct = useMemo(() => {
    if (!user) return false;
    const currentPlayer = players[currentPlayerIndex];
    const isCurrentPlayer = currentPlayer?.id === user.id;
    const notificationsActive = isActionNotificationActive();

    // In Pre-Flop (stage 0), player must have hole cards dealt before they can act
    if (stage === 0) {
      const hasCards = currentPlayer?.hand && currentPlayer.hand.length > 0;
      return isCurrentPlayer && !notificationsActive && hasCards;
    }

    return isCurrentPlayer && !notificationsActive;
  }, [user, players, currentPlayerIndex, isActionNotificationActive, stage]);

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
  const resetGameState = useCallback(() => {
    console.log('[PokerProvider] Resetting game state');

    // Reset all game state
    createResetGameState({
      setGameId,
      setPlayers,
      setDeck,
      setCommunalCards,
      setPot,
      setStage,
      setLocked,
      setCurrentPlayerIndex,
      setDealerButtonPosition,
      setPlayerBets,
      setGameStages,
      setWinner,
      setActionHistory,
      setActionTimer,
    })();

    // Reset notifications and coordinator state
    resetNotifications();
    resetCoordinator();
  }, [resetNotifications, resetCoordinator]);

  const updateGameId = useCallback(createUpdateGameId(setGameId), []);
  const updatePlayers = useCallback(createUpdatePlayers(setPlayers), []);

  // Coordinated betting state updater - uses turn coordinator for currentPlayerIndex
  const updateBettingState = useCallback((
    pot: Bet[],
    playerBets: number[],
    currentPlayerIndex: number
  ) => {
    // Always update pot, playerBets, and currentPlayerIndex immediately
    setPot(pot);
    setPlayerBets(playerBets);
    setCurrentPlayerIndex(currentPlayerIndex);
  }, []);

  // Coordinated stage updater - uses stage coordinator to delay updates until notifications complete
  const updateStageState = useCallback((
    stage: number,
    communalCards: Card[],
    deck: Card[],
    stages?: GameStageProps[]
  ) => {
    // Clear player action notifications before ALL stage advancements
    // This ensures notifications don't persist across betting rounds
    const currentStage = stateRef.current.stage;
    const isStageAdvancing = stage > currentStage;

    if (isStageAdvancing && stage > 0) { // Clear for all stage advancements (Flop, Turn, River, Showdown)
      console.log('[UpdateStageState] Stage advancing from', currentStage, 'to', stage, '- Clearing all player notifications');
      clearAllPlayerNotifications();
    }

    // Always update deck and game stages immediately
    setDeck(deck);
    if (stages) setGameStages(stages);

    console.log('[UpdateStageState] Calling applyStageUpdate:', {
      currentStage,
      newStage: stage,
      isStageAdvancing,
      communalCardsCount: communalCards.length
    });

    // Use stage coordinator for stage and communalCards updates
    // This delays the update until the notification completes
    applyStageUpdate(
      { stage, communalCards },
      setStage,
      setCommunalCards,
      undefined,
      autoAdvanceMode
    );
  }, [applyStageUpdate, autoAdvanceMode, clearAllPlayerNotifications]);
  const updateGameStatus = useCallback(
    createUpdateGameStatus(setLocked, setWinner),
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
      setActionTimer,
      setDealerButtonPosition
    ),
    [updateGameId, updatePlayers, updateBettingState, updateStageState, updateGameStatus]
  );

  // --- Create API actions ---
  const joinGame = useCallback(
    createJoinGameAction(setGameId, socket, user?.username || user?.email, setUser),
    [socket, user, setUser]
  );

  // Wrap placeBet to set processing state and update optimistically
  const placeBetOriginal = useCallback(createPlaceBetAction(gameId, socket), [gameId, socket]);

  const placeBet = useCallback(async (chipCount: number) => {
    if (isActionProcessing || !user?.id) return;

    const actionType = currentBet === 0 ? 'bet' : (chipCount > currentBet ? 'raise' : 'call');

    // Find current player's username
    const currentPlayer = players.find(p => p.id === user.id);
    if (!currentPlayer) {
      console.error('Current player not found');
      return;
    }

    // Determine action message (without player name - will show on their card)
    let actionMessage = '';
    if (chipCount === 0) {
      actionMessage = 'Checked';
    } else if (actionType === 'bet') {
      actionMessage = `Bet $${chipCount}`;
    } else if (actionType === 'raise') {
      actionMessage = `Raised to $${chipCount}`;
    } else if (actionType === 'call') {
      actionMessage = 'Called';
    }

    // Show notification on player card immediately (optimistically)
    showPlayerNotification({
      playerId: user.id,
      message: actionMessage,
      timestamp: Date.now(),
    }, playSound);

    // Optimistically update pot, playerBets, and player chips IMMEDIATELY on acting client
    if (chipCount > 0) {
      console.log('[PlaceBet] Optimistically updating pot, playerBets, and player chips immediately');

      // Update pot
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

      // Update player's chip count
      setPlayers(prevPlayers => {
        return prevPlayers.map(p => {
          if (p.id === user.id) {
            return {
              ...p,
              chipCount: p.chipCount - chipCount
            };
          }
          return p;
        });
      });
    }

    // Execute action immediately (not waiting for notification)
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
  }, [placeBetOriginal, isActionProcessing, user, currentBet, players, showPlayerNotification, setPot, setPlayerBets, setPlayers, gameId, playSound]);

  // Wrap fold to set processing state
  const foldOriginal = useCallback(createFoldAction(gameId, socket), [gameId, socket]);
  const fold = useCallback(async () => {
    if (isActionProcessing || !user?.id) return;

    // Find current player's username
    const currentPlayer = players.find(p => p.id === user.id);
    if (!currentPlayer) {
      console.error('Current player not found');
      return;
    }

    // Show notification on player card immediately (optimistically)
    showPlayerNotification({
      playerId: user.id,
      message: 'Folded',
      timestamp: Date.now(),
    }, playSound);

    // Execute fold action immediately (not waiting for notification)
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
  }, [foldOriginal, isActionProcessing, user, players, showPlayerNotification, gameId, playSound]);
  const leaveGame = useCallback(
    createLeaveGameAction(gameId, resetGameState, setAvailableGames, socket),
    [gameId, resetGameState, socket]
  );
  const deleteGameFromLobby = useCallback(
    createDeleteGameAction(setAvailableGames),
    []
  );
  const setTurnTimerAction = useCallback(createSetTurnTimerAction(gameId, socket), [gameId, socket]);
  const setPresence = useCallback(createSetPresenceAction(gameId, socket), [gameId, socket]);
  const resetSingleton = useCallback(
    createResetSingletonAction(gameId, updateGameState),
    [gameId, updateGameState]
  );

  // Track if player is a human player in the game
  const isUserInGame = useMemo(() => {
    return user && players.some(p => p.id === user.id && !p.isAI);
  }, [user, players]);

  // Refs to store values for cleanup function
  const presenceRef = useRef<{ socket: typeof socket; gameId: string | null; isUserInGame: boolean }>({
    socket: null,
    gameId: null,
    isUserInGame: false,
  });

  // Keep refs updated
  useEffect(() => {
    presenceRef.current = { socket, gameId, isUserInGame: !!isUserInGame };
    if (isUserInGame) {
      console.log('[PokerProvider] Ref updated - isUserInGame:', isUserInGame, 'gameId:', gameId);
    }
  }, [socket, gameId, isUserInGame]);

  // Track player presence when navigating to/from the /poker route
  useEffect(() => {
    if (!isUserInGame || !socket?.connected || !gameId) return;

    // Mark as present when entering the route
    setPresence(false);
    console.log('[PokerProvider] Marked player as present');

    // Mark as away when leaving the route (cleanup)
    // Use ref to get current values at cleanup time
    return () => {
      const { socket: currentSocket, gameId: currentGameId, isUserInGame: wasInGame } = presenceRef.current;
      console.log('[PokerProvider] Cleanup running - wasInGame:', wasInGame, 'hasSocket:', !!currentSocket, 'socketConnected:', currentSocket?.connected, 'gameId:', currentGameId);

      if (!wasInGame || !currentSocket || !currentGameId) {
        console.log('[PokerProvider] Skipping away presence - not in game or no socket');
        return;
      }

      if (!currentSocket.connected) {
        console.log('[PokerProvider] Socket disconnected - cannot send away presence');
        return;
      }

      try {
        currentSocket.emit('poker:set_presence', { gameId: currentGameId, isAway: true });
        console.log('[PokerProvider] Sent away presence on cleanup for gameId:', currentGameId);
      } catch (error) {
        console.error('[PokerProvider] Failed to send away presence:', error);
      }
    };
  }, [isUserInGame, socket, gameId, setPresence]);

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

  // Timer expiration is now fully handled server-side via setTimeout in poker-timer-controller
  // No client-side fallback needed - server executes action when timer expires

  useEffect(() => {
    // Clear winner when returning to preflop stage (game reset)
    if (winner && stage === 0) setWinner(undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage])

  // Auto-restart is now handled by notification system:
  // 1. Winner notification completes (10s)
  // 2. Server emits round_complete with winner: undefined
  // 3. "Game starting!" notification shows (10s countdown)
  // 4. onComplete triggers game lock via /api/poker/lock

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
    setAutoAdvanceMode,
    playSound,
    setCurrentPlayerIndex,
    setDealerButtonPosition,
    showNotification,
    clearAllPlayerNotifications,
  });

  // --- Memoized context values ---
  const gameStateValue = useMemo(() => ({
    stage,
    stages: gameStages,
    locked,
    currentPlayerIndex,
    dealerButtonPosition,
    currentBet,
    playerBets,
    communalCards,
    deck,
    winner,
    actionTimer,
    actionHistory,
    isLoading,
    selectedAction,
    setSelectedAction,
    canPlayerAct,
  }), [stage, gameStages, locked, currentPlayerIndex, dealerButtonPosition, currentBet, playerBets, communalCards, deck, winner, actionTimer, actionHistory, isLoading, selectedAction, canPlayerAct]);

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
    placeBet,
    fold,
    leaveGame,
    deleteGameFromLobby,
    setTurnTimerAction,
    resetSingleton,
    clearTimerOptimistically,
    playSound,
    // Expose state updaters for optimistic updates
    setPot,
    setPlayerBets,
    setPlayers,
    setCurrentPlayerIndex,
    setCommunalCards,
    setLocked,
    setWinner,
  }), [joinGame, placeBet, fold, leaveGame, deleteGameFromLobby, setTurnTimerAction, resetSingleton, clearTimerOptimistically, playSound, setPot, setPlayerBets, setPlayers, setCurrentPlayerIndex, setCommunalCards, setLocked, setWinner]);

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

// ============= Outer Provider Component =============

export function PokerProvider({ children }: { children: ReactNode }) {
  return (
    <NotificationProvider>
      <PlayerNotificationProvider>
        <PokerProviderInner>
          {children}
        </PokerProviderInner>
      </PlayerNotificationProvider>
    </NotificationProvider>
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

export { useNotifications } from './notification-provider';
