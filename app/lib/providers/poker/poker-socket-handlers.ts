// app/lib/providers/poker/poker-socket-handlers.ts

import type { Socket } from 'socket.io-client';
import type { Player, Card, Bet } from '@/app/lib/definitions/poker';
import type { PokerStateUpdatePayload, PokerGameDeletedPayload } from '@/app/lib/socket/events';

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
}

export const createStateUpdateHandler = (deps: SocketHandlerDeps) => {
  return (payload: PokerStateUpdatePayload) => {
    console.log('[Client] Received POKER_STATE_UPDATE:', {
      playersCount: payload.players?.length,
      players: payload.players?.map((p: any) => p.username),
      stage: payload.stage,
      locked: payload.locked,
    });

    const currentState = deps.stateRef.current;

    // Detect what changed and update only relevant parts
    const playersChanged = JSON.stringify(currentState.players) !== JSON.stringify(payload.players);
    const bettingChanged =
      JSON.stringify(currentState.pot) !== JSON.stringify(payload.pot) ||
      JSON.stringify(currentState.playerBets) !== JSON.stringify(payload.playerBets) ||
      currentState.currentPlayerIndex !== payload.currentPlayerIndex;
    const stageChanged =
      currentState.stage !== payload.stage ||
      JSON.stringify(currentState.communalCards) !== JSON.stringify(payload.communalCards);
    const statusChanged =
      currentState.locked !== payload.locked ||
      JSON.stringify(currentState.winner) !== JSON.stringify(payload.winner);

    console.log('[Client] Change detection:', {
      playersChanged,
      currentPlayers: currentState.players?.map((p: any) => p.username),
      newPlayers: payload.players?.map((p: any) => p.username),
      bettingChanged,
      stageChanged,
      statusChanged,
    });

    // Update game ID if present
    if (payload._id && currentState.gameId !== payload._id.toString()) {
      deps.updaters.updateGameId(payload._id.toString());
    }

    // Always update all state to prevent sync issues
    // Change detection is kept for logging purposes only
    if (playersChanged) {
      console.log('[Client] Players changed, updating from', currentState.players?.length, 'to', payload.players?.length);
    }
    deps.updaters.updatePlayers(payload.players);

    // Always update betting state - critical for player controls
    if (bettingChanged || statusChanged) {
      console.log('[Client] Betting or status changed, updating betting state...');
    }
    deps.updaters.updateBettingState(payload.pot, payload.playerBets || [], payload.currentPlayerIndex || 0);

    if (stageChanged) {
      console.log('[Client] Stage changed, updating...');
    }
    deps.updaters.updateStageState(payload.stage, payload.communalCards, payload.deck, (payload as any).stages);

    if (statusChanged) {
      console.log('[Client] Status changed, updating...');
    }
    deps.updaters.updateGameStatus(payload.locked, payload.lockTime, payload.winner);

    // Update action history if present in payload
    if ((payload as any).actionHistory) {
      console.log('[Client] Action history changed, updating...', (payload as any).actionHistory.length, 'actions');
      deps.setActionHistory((payload as any).actionHistory);
    }

    // Update action timer if present in payload
    if ((payload as any).actionTimer !== undefined) {
      console.log('[Client] Action timer changed, updating...');
      deps.setActionTimer((payload as any).actionTimer);
    }
  };
};

export const createGameCreatedHandler = (
  setAvailableGames: React.Dispatch<React.SetStateAction<Array<{ id: string; code: string; creatorId: string | null }>>>
) => {
  return (payload: any) => {
    console.log('[Client] Received POKER_GAME_CREATED:', payload);
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
    console.log('[Client] Received POKER_GAME_DELETED:', payload);
    console.log('[Client] Current gameId:', gameId, '| Deleted gameId:', payload.gameId);

    setAvailableGames(prev => prev.filter(g => g.id !== payload.gameId));

    // If the deleted game is the current game OR gameId is null (viewing a game without tracking ID), reset game state
    if (gameId === payload.gameId || gameId === null) {
      console.log('[Client] Resetting game state - game was deleted');
      resetGameState();
    } else {
      console.log('[Client] Not resetting - deleted game is not current game');
    }
  };
};

export const createPlayerJoinedHandler = (
  updatePlayers: (players: Player[]) => void,
  setActionHistory: (history: any[]) => void,
  updateGameStatus: (locked: boolean, lockTime?: string, winner?: any) => void
) => {
  return (payload: any) => {
    console.log('[Client] Received POKER_PLAYER_JOINED:', payload.player.username, '- Total players:', payload.playerCount);
    updatePlayers(payload.players);
    if (payload.actionHistory) {
      setActionHistory(payload.actionHistory);
    }
    // Update lockTime if present (when 2nd player joins and lock timer starts)
    if (payload.lockTime !== undefined) {
      console.log('[Client] Lock timer started:', payload.lockTime);
      updateGameStatus(false, payload.lockTime, undefined);
    }
  };
};

export const createPlayerLeftHandler = (
  updatePlayers: (players: Player[]) => void,
  updateGameStatus: (locked: boolean, lockTime?: string, winner?: any) => void,
  setActionHistory: (history: any[]) => void
) => {
  return (payload: any) => {
    console.log('[Client] Received POKER_PLAYER_LEFT:', payload.playerId, '- Remaining:', payload.playerCount);
    updatePlayers(payload.players);

    // Update action history if provided
    if (payload.actionHistory) {
      setActionHistory(payload.actionHistory);
    }

    // If game was reset (all players left), reset game status
    if (payload.gameReset) {
      updateGameStatus(false, undefined, undefined);
    }
  };
};

export const createGameLockedHandler = (
  updatePlayers: (players: Player[]) => void,
  updateGameStatus: (locked: boolean, lockTime?: string, winner?: any) => void,
  setStage: (stage: number) => void
) => {
  return (payload: any) => {
    console.log('[Client] Received POKER_GAME_LOCKED: Game starting!');
    updatePlayers(payload.players); // Players now have dealt cards
    updateGameStatus(true, payload.lockTime, undefined);
    setStage(payload.stage);
  };
};

export const createBetPlacedHandler = (
  updateBettingState: (pot: Bet[], playerBets: number[], currentPlayerIndex: number) => void,
  setActionHistory: (history: any[]) => void
) => {
  return (payload: any) => {
    console.log('[Client] Received POKER_BET_PLACED:', payload);
    updateBettingState(payload.pot, payload.playerBets, payload.currentPlayerIndex);

    // Update action history if present in payload
    if (payload.actionHistory) {
      console.log('[Client] Updating action history from bet placed event');
      setActionHistory(payload.actionHistory);
    }
  };
};

export const createCardsDealtHandler = (
  setStage: (stage: number) => void,
  setCommunalCards: (cards: Card[]) => void
) => {
  return (payload: any) => {
    console.log('[Client] Received POKER_CARDS_DEALT:', payload);
    setStage(payload.stage);
    setCommunalCards(payload.communalCards);
  };
};

export const createRoundCompleteHandler = (
  setWinner: (winner: any) => void,
  updatePlayers: (players: Player[]) => void
) => {
  return (payload: any) => {
    console.log('[Client] Received POKER_ROUND_COMPLETE:', payload);
    setWinner(payload.winner);
    updatePlayers(payload.players);
  };
};

export const createTimerStartedHandler = (
  setActionTimer: React.Dispatch<React.SetStateAction<any>>
) => {
  return (payload: any) => {
    console.log('[Client] Received POKER_ACTION_TIMER_STARTED:', payload);
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
    console.log('[Client] Received POKER_ACTION_TIMER_PAUSED:', payload);
    setActionTimer((prev: any) => prev ? { ...prev, isPaused: true } : undefined);
  };
};

export const createTimerResumedHandler = (
  setActionTimer: React.Dispatch<React.SetStateAction<any>>
) => {
  return (payload: any) => {
    console.log('[Client] Received POKER_ACTION_TIMER_RESUMED:', payload);
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
    console.log('[Client] Received POKER_ACTION_TIMER_CLEARED');
    setActionTimer(undefined);
  };
};

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
    handleGameLocked: (payload: any) => void;
    handleBetPlaced: (payload: any) => void;
    handleCardsDealt: (payload: any) => void;
    handleRoundComplete: (payload: any) => void;
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
  socket.on(SOCKET_EVENTS.POKER_GAME_LOCKED, handlers.handleGameLocked);
  socket.on(SOCKET_EVENTS.POKER_BET_PLACED, handlers.handleBetPlaced);
  socket.on(SOCKET_EVENTS.POKER_CARDS_DEALT, handlers.handleCardsDealt);
  socket.on(SOCKET_EVENTS.POKER_ROUND_COMPLETE, handlers.handleRoundComplete);
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
    socket.off(SOCKET_EVENTS.POKER_GAME_LOCKED, handlers.handleGameLocked);
    socket.off(SOCKET_EVENTS.POKER_BET_PLACED, handlers.handleBetPlaced);
    socket.off(SOCKET_EVENTS.POKER_CARDS_DEALT, handlers.handleCardsDealt);
    socket.off(SOCKET_EVENTS.POKER_ROUND_COMPLETE, handlers.handleRoundComplete);
    socket.off(SOCKET_EVENTS.POKER_ACTION_TIMER_STARTED, handlers.handleTimerStarted);
    socket.off(SOCKET_EVENTS.POKER_ACTION_TIMER_PAUSED, handlers.handleTimerPaused);
    socket.off(SOCKET_EVENTS.POKER_ACTION_TIMER_RESUMED, handlers.handleTimerResumed);
    socket.off(SOCKET_EVENTS.POKER_ACTION_TIMER_CLEARED, handlers.handleTimerCleared);
  };
};
