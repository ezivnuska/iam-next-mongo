// app/lib/providers/poker/poker-socket-handlers.ts

import type { Socket } from 'socket.io-client';
import type { Player, Card, Bet } from '@/app/games/poker/lib/definitions/poker';
import type { PokerStateUpdatePayload, PokerGameDeletedPayload } from '@/app/lib/socket/events';
import type { PokerSoundType } from '../hooks/use-poker-sounds';
import type { NotificationType } from './notification-provider';

// ============= Socket Handler Factory Functions =============

export interface GameStateSnapshot {
  players: Player[];
  pot: Bet[];
  playerBets: number[];
  currentPlayerIndex: number;
  stage: number;
  communalCards: Card[];
  locked: boolean;
  winner?: {
    winnerId: string;
    winnerName: string;
    handRank: string;
    isTie: boolean;
    tiedPlayers?: string[];
  };
  gameId: string | null;
}

export interface StateUpdaters {
  updateGameId: (id: string) => void;
  updatePlayers: (players: Player[]) => void;
  updateBettingState: (pot: Bet[], playerBets: number[], currentPlayerIndex: number) => void;
  updateStageState: (stage: number, communalCards: Card[], deck: Card[], stages?: any[]) => void;
  updateGameStatus: (locked: boolean, lockTime?: string, winner?: any) => void;
}

export interface SocketHandlerDeps {
  stateRef: React.MutableRefObject<GameStateSnapshot>;
  updaters: StateUpdaters;
  gameId: string | null;
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
  getGameNotification?: () => { type: string; timestamp: number; duration: number } | null;
  user?: any;
  setUser?: (user: any) => void;
}

export const createStateUpdateHandler = (deps: SocketHandlerDeps) => {
  return (payload: PokerStateUpdatePayload) => {
    const currentState = deps.stateRef.current;

    // Update game ID if present
    if (payload._id && currentState.gameId !== payload._id.toString()) {
      deps.updaters.updateGameId(payload._id.toString());
    }

    // If this is a guest user who returned (ID is guest-pending), update their ID from the players array
    if (deps.user?.isGuest && deps.user?.id === 'guest-pending' && deps.user?.username && deps.setUser) {
      const actualPlayer = payload.players.find((p: Player) =>
        p.id.startsWith('guest-') &&
        p.username === deps.user.username &&
        !p.isAI
      );
      if (actualPlayer) {
        deps.setUser({ ...deps.user, id: actualPlayer.id });
      }
    }

    // Update all state to prevent sync issues
    deps.updaters.updatePlayers(payload.players);
    deps.updaters.updateBettingState(payload.pot, payload.playerBets || [], payload.currentPlayerIndex || 0);
    deps.updaters.updateStageState(payload.stage, payload.communalCards, payload.deck, (payload as any).stages);
    deps.updaters.updateGameStatus(payload.locked, payload.lockTime, payload.winner);

    // Update action history if present in payload
    if ((payload as any).actionHistory) {
      deps.setActionHistory((payload as any).actionHistory);

      // Check for fold and winner in action history
      const actionHistory = (payload as any).actionHistory;
      if (actionHistory && actionHistory.length > 0) {
        const lastAction = actionHistory[actionHistory.length - 1];

        // Check if second-to-last action was a fold (last is usually GAME_ENDED)
        const secondLastAction = actionHistory.length > 1 ? actionHistory[actionHistory.length - 2] : null;

        // NOTE: Sounds are now handled centrally by notification system (use-poker-event-handler.ts)
        // This prevents duplicate sounds and ensures consistent timing
      }
    }

    // Update action timer if present in payload
    if ((payload as any).actionTimer !== undefined) {
      deps.setActionTimer((payload as any).actionTimer);
    }

    // Update auto-advance mode if present in payload
    if ((payload as any).autoAdvanceMode !== undefined) {
      deps.setAutoAdvanceMode((payload as any).autoAdvanceMode);
    }

    // Clear action processing state (used for fold action which triggers full state update)
    deps.setIsActionProcessing(false);
    deps.setPendingAction(null);
  };
};

export const createGameCreatedHandler = (
  setAvailableGames: React.Dispatch<React.SetStateAction<Array<{ id: string; code: string; creatorId: string | null }>>>
) => {
  return (payload: any) => {
    const newGame = {
      id: payload.gameId || payload._id?.toString(),
      code: payload.game?.code || payload.code,
      creatorId: payload.game?.players?.[0]?.id || payload.players?.[0]?.id || null
    };
    setAvailableGames(prev => {
      // Avoid duplicates
      if (prev.some(g => g.id === newGame.id)) return prev;
      return [...prev, newGame];
    });
  };
};

export const createGameDeletedHandler = (
  gameId: string | null,
  resetGameState: () => void,
  setAvailableGames: React.Dispatch<React.SetStateAction<Array<{ id: string; code: string; creatorId: string | null }>>>
) => {
  return (payload: PokerGameDeletedPayload) => {
    setAvailableGames(prev => prev.filter(g => g.id !== payload.gameId));

    // If the deleted game is the current game OR gameId is null (viewing a game without tracking ID), reset game state
    if (gameId === payload.gameId || gameId === null) {
      resetGameState();
    }
  };
};

export const createPlayerJoinedHandler = (
  updatePlayers: (players: Player[]) => void,
  setActionHistory: (history: any[]) => void,
  updateGameStatus: (locked: boolean, lockTime?: string, winner?: any) => void
) => {
  return (payload: any) => {
    updatePlayers(payload.players);
    if (payload.actionHistory) {
      setActionHistory(payload.actionHistory);
    }
    // Update lockTime if present (when 2nd player joins and lock timer starts)
    if (payload.lockTime !== undefined) {
      updateGameStatus(false, payload.lockTime, undefined);
    }
  };
};

export const createPlayerLeftHandler = (
  updatePlayers: (players: Player[]) => void,
  updateGameStatus: (locked: boolean, lockTime?: string, winner?: any) => void,
  setActionHistory: (history: any[]) => void,
  playSound?: (sound: PokerSoundType) => void,
  user?: any
) => {
  return (payload: any) => {
    updatePlayers(payload.players);

    // Update action history if provided
    if (payload.actionHistory) {
      setActionHistory(payload.actionHistory);
      // NOTE: Sounds handled by notification system
    }

    // If game was reset (all players left), reset game status
    if (payload.gameReset) {
      updateGameStatus(false, undefined, undefined);
    }

    // If the removed player is the current guest user, clear their credentials
    if (user?.isGuest && payload.playerId === user.id) {
      try {
        localStorage.removeItem('poker_guest_id');
        localStorage.removeItem('poker_guest_username');
        localStorage.removeItem('poker_guest_created_at');
      } catch (e) {
        console.warn('Failed to clear guest credentials on auto-removal:', e);
      }
    }
  };
};

export const createGameLockedHandler = (
  updatePlayers: (players: Player[]) => void,
  updateGameStatus: (locked: boolean, lockTime?: string, winner?: any) => void,
  setStage: (stage: number) => void,
  updateBettingState: (pot: Bet[], playerBets: number[], currentPlayerIndex: number) => void,
  setActionHistory: (history: any[]) => void,
  playSound: (sound: PokerSoundType) => void
) => {
  return (payload: any) => {
    updatePlayers(payload.players); // Players with empty hands (cards dealt later)
    updateGameStatus(true, payload.lockTime, undefined);
    // Don't set stage here - let POKER_CARDS_DEALT event handle it through the stage coordinator
    // This ensures stage advancement is detected and sounds play correctly
    // setStage(payload.stage);

    // NOTE: pot and playerBets are no longer included in game locked event
    // They're synced via blind_posted notifications and state updates from step flow
    // This prevents race condition where empty betting state overwrites blinds

    // Update action history if present
    if (payload.actionHistory !== undefined) {
      setActionHistory(payload.actionHistory);
    }

    // Note: Card deal sound will play when POKER_CARDS_DEALT event is received
  };
};

export const createBetPlacedHandler = (
  updateBettingState: (pot: Bet[], playerBets: number[], currentPlayerIndex: number) => void,
  setActionHistory: (history: any[]) => void,
  setIsActionProcessing: (processing: boolean) => void,
  setPendingAction: (action: { type: 'bet' | 'fold' | 'call' | 'raise'; playerId: string } | null) => void,
  playSound: (sound: PokerSoundType) => void,
  updatePlayers?: (players: Player[]) => void
) => {
  return (payload: any) => {
    updateBettingState(payload.pot, payload.playerBets, payload.currentPlayerIndex);

    // Update players if provided (for chip count and all-in status changes)
    if (payload.players && updatePlayers) {
      updatePlayers(payload.players);
    }

    // Update action history
    if (payload.actionHistory && payload.actionHistory.length > 0) {
      setActionHistory(payload.actionHistory);
      // NOTE: Sounds handled by notification system
    }

    // Clear action processing state (bet/call/raise actions trigger this event)
    setIsActionProcessing(false);
    setPendingAction(null);
  };
};

export const createCardsDealtHandler = (
  updateStageState: (stage: number, communalCards: Card[], deck: Card[], stages?: any[]) => void,
  updatePlayers?: (players: Player[]) => void,
  playSound?: (sound: PokerSoundType) => void,
  setCurrentPlayerIndex?: (index: number) => void
) => {
  return (payload: any) => {
    // Update current player index immediately
    if (payload.currentPlayerIndex !== undefined && setCurrentPlayerIndex) {
      setCurrentPlayerIndex(payload.currentPlayerIndex);
    }

    // Update players immediately (hands, chips, all-in status)
    if (payload.players && updatePlayers) {
      updatePlayers(payload.players);
    }

    // Route stage and communal cards through the coordinated update system
    // This will queue the notification and delay the card display until notification completes
    // NOTE: Sound effects are played by the stage coordinator when cards are actually displayed
    updateStageState(
      payload.stage,
      payload.communalCards || [],
      payload.deck || [],
      payload.stages
    );
  };
};

export const createRoundCompleteHandler = (
  setWinner: (winner: any) => void,
  updatePlayers: (players: Player[]) => void,
  playSound?: (sound: PokerSoundType) => void,
  showNotification?: (notification: { message: string; type: NotificationType; duration: number; onComplete?: () => void; metadata?: any }) => void,
  gameId?: string | null
) => {
  return (payload: any) => {
    setWinner(payload.winner);
    updatePlayers(payload.players);

    // NOTE: Sounds handled by notification system

    // Game restart flow is now fully server-driven:
    // 1. Server emits round_complete with winner (10s notification)
    // 2. Server automatically resets game after notification completes
    // 3. Server emits round_complete with winner: undefined
    // 4. Server auto-locks game after AUTO_LOCK_DELAY_MS
    // 5. Server emits game_locked event
    // All timing and state transitions handled server-side to avoid client-side fetch calls
  };
};

export const createDealerButtonMovedHandler = (
  setDealerButtonPosition: (position: number) => void
) => {
  return (payload: { dealerButtonPosition: number }) => {
    setDealerButtonPosition(payload.dealerButtonPosition);
  };
};

export const createPlayerPresenceUpdatedHandler = (
  updatePlayers: (players: Player[]) => void,
  getPlayers: () => Player[]
) => {
  return (payload: { playerId: string; isAway: boolean; username?: string }) => {
    const currentPlayers = getPlayers();

    const updatedPlayers = currentPlayers.map(p => {
      // Match by ID first
      let isMatch = p.id === payload.playerId;

      // For guest players, also try username match as fallback
      if (!isMatch && payload.playerId.startsWith('guest-') && payload.username && p.username) {
        isMatch = p.username === payload.username;
      }

      return isMatch ? { ...p, isAway: payload.isAway } : p;
    });

    updatePlayers(updatedPlayers);
  };
};

export const createGameUnlockedHandler = (
  updateGameStatus: (locked: boolean, lockTime?: string, winner?: any) => void,
  setStage: (stage: number) => void,
  setDealerButtonPosition: (position: number) => void
) => {
  return (payload: { locked: false; stage: number; dealerButtonPosition: number }) => {
    updateGameStatus(false, undefined, undefined);
    setStage(payload.stage);
    setDealerButtonPosition(payload.dealerButtonPosition);
  };
};

export const createTimerStartedHandler = (
  setActionTimer: React.Dispatch<React.SetStateAction<any>>
) => {
  return (payload: any) => {
    setActionTimer({
      startTime: payload.startTime,
      duration: payload.duration,
      currentActionIndex: payload.currentActionIndex,
      totalActions: payload.totalActions,
      actionType: payload.actionType,
      targetPlayerId: payload.targetPlayerId,
      isPaused: false,
    });
  };
};

export const createTimerPausedHandler = (
  setActionTimer: React.Dispatch<React.SetStateAction<any>>
) => {
  return (payload: any) => {
    setActionTimer((prev: any) => prev ? { ...prev, isPaused: true } : undefined);
  };
};

export const createTimerResumedHandler = (
  setActionTimer: React.Dispatch<React.SetStateAction<any>>
) => {
  return (payload: any) => {
    setActionTimer({
      startTime: payload.resumedAt,
      duration: payload.duration,
      currentActionIndex: payload.currentActionIndex,
      totalActions: payload.totalActions,
      actionType: payload.actionType,
      targetPlayerId: payload.targetPlayerId,
      isPaused: false,
    });
  };
};

export const createTimerClearedHandler = (
  setActionTimer: React.Dispatch<React.SetStateAction<any>>
) => {
  return () => {
    setActionTimer(undefined);
  };
};

// Old game notification handler removed - notifications now handled by NotificationProvider

export const registerSocketHandlers = (
  socket: Socket,
  handlers: {
    handleConnect: () => void;
    handleDisconnect: () => void;
    handleStateUpdate: (payload: PokerStateUpdatePayload) => void;
    handleGameCreated: (payload: any) => void;
    handleGameDeleted: (payload: PokerGameDeletedPayload) => void;
    handlePlayerJoined: (payload: any) => void;
    handlePlayerLeft: (payload: any) => void;
    handlePlayerPresenceUpdated: (payload: any) => void;
    handleGameLocked: (payload: any) => void;
    handleGameUnlocked: (payload: any) => void;
    handleBetPlaced: (payload: any) => void;
    handleCardsDealt: (payload: any) => void;
    handleRoundComplete: (payload: any) => void;
    handleDealerButtonMoved: (payload: any) => void;
    handleTimerStarted: (payload: any) => void;
    handleTimerPaused: (payload: any) => void;
    handleTimerResumed: (payload: any) => void;
    handleTimerCleared: () => void;
  },
  SOCKET_EVENTS: any
) => {
  socket.on('connect', handlers.handleConnect);
  socket.on('disconnect', handlers.handleDisconnect);
  socket.on(SOCKET_EVENTS.POKER_STATE_UPDATE, handlers.handleStateUpdate);
  socket.on(SOCKET_EVENTS.POKER_GAME_CREATED, handlers.handleGameCreated);
  socket.on(SOCKET_EVENTS.POKER_GAME_DELETED, handlers.handleGameDeleted);
  socket.on(SOCKET_EVENTS.POKER_PLAYER_JOINED, handlers.handlePlayerJoined);
  socket.on(SOCKET_EVENTS.POKER_PLAYER_LEFT, handlers.handlePlayerLeft);
  socket.on(SOCKET_EVENTS.POKER_PLAYER_PRESENCE_UPDATED, handlers.handlePlayerPresenceUpdated);
  socket.on(SOCKET_EVENTS.POKER_GAME_LOCKED, handlers.handleGameLocked);
  socket.on(SOCKET_EVENTS.POKER_GAME_UNLOCKED, handlers.handleGameUnlocked);
  socket.on(SOCKET_EVENTS.POKER_BET_PLACED, handlers.handleBetPlaced);
  socket.on(SOCKET_EVENTS.POKER_CARDS_DEALT, handlers.handleCardsDealt);
  socket.on(SOCKET_EVENTS.POKER_ROUND_COMPLETE, handlers.handleRoundComplete);
  socket.on(SOCKET_EVENTS.POKER_DEALER_BUTTON_MOVED, handlers.handleDealerButtonMoved);
  socket.on(SOCKET_EVENTS.POKER_ACTION_TIMER_STARTED, handlers.handleTimerStarted);
  socket.on(SOCKET_EVENTS.POKER_ACTION_TIMER_PAUSED, handlers.handleTimerPaused);
  socket.on(SOCKET_EVENTS.POKER_ACTION_TIMER_RESUMED, handlers.handleTimerResumed);
  socket.on(SOCKET_EVENTS.POKER_ACTION_TIMER_CLEARED, handlers.handleTimerCleared);

  return () => {
    socket.off('connect', handlers.handleConnect);
    socket.off('disconnect', handlers.handleDisconnect);
    socket.off(SOCKET_EVENTS.POKER_STATE_UPDATE, handlers.handleStateUpdate);
    socket.off(SOCKET_EVENTS.POKER_GAME_CREATED, handlers.handleGameCreated);
    socket.off(SOCKET_EVENTS.POKER_GAME_DELETED, handlers.handleGameDeleted);
    socket.off(SOCKET_EVENTS.POKER_PLAYER_JOINED, handlers.handlePlayerJoined);
    socket.off(SOCKET_EVENTS.POKER_PLAYER_LEFT, handlers.handlePlayerLeft);
    socket.off(SOCKET_EVENTS.POKER_PLAYER_PRESENCE_UPDATED, handlers.handlePlayerPresenceUpdated);
    socket.off(SOCKET_EVENTS.POKER_GAME_LOCKED, handlers.handleGameLocked);
    socket.off(SOCKET_EVENTS.POKER_GAME_UNLOCKED, handlers.handleGameUnlocked);
    socket.off(SOCKET_EVENTS.POKER_BET_PLACED, handlers.handleBetPlaced);
    socket.off(SOCKET_EVENTS.POKER_CARDS_DEALT, handlers.handleCardsDealt);
    socket.off(SOCKET_EVENTS.POKER_ROUND_COMPLETE, handlers.handleRoundComplete);
    socket.off(SOCKET_EVENTS.POKER_DEALER_BUTTON_MOVED, handlers.handleDealerButtonMoved);
    socket.off(SOCKET_EVENTS.POKER_ACTION_TIMER_STARTED, handlers.handleTimerStarted);
    socket.off(SOCKET_EVENTS.POKER_ACTION_TIMER_PAUSED, handlers.handleTimerPaused);
    socket.off(SOCKET_EVENTS.POKER_ACTION_TIMER_RESUMED, handlers.handleTimerResumed);
    socket.off(SOCKET_EVENTS.POKER_ACTION_TIMER_CLEARED, handlers.handleTimerCleared);
  };
};
