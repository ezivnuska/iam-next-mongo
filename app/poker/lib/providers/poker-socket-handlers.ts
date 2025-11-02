// app/lib/providers/poker/poker-socket-handlers.ts

import type { Socket } from 'socket.io-client';
import type { Player, Card, Bet } from '@/app/poker/lib/definitions/poker';
import type { PokerStateUpdatePayload, PokerGameDeletedPayload } from '@/app/lib/socket/events';
import type { PokerSoundType } from '../hooks/use-poker-sounds';

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
  playSound: (sound: PokerSoundType) => void;
}

export const createStateUpdateHandler = (deps: SocketHandlerDeps) => {
  return (payload: PokerStateUpdatePayload) => {
    const currentState = deps.stateRef.current;

    // Update game ID if present
    if (payload._id && currentState.gameId !== payload._id.toString()) {
      deps.updaters.updateGameId(payload._id.toString());
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

        if (secondLastAction?.actionType === 'PLAYER_FOLD') {
          deps.playSound('fold');
        }

        // Check if game ended with a winner and play winner sound
        if (lastAction?.actionType === 'GAME_ENDED' && payload.winner) {
          deps.playSound('winner');
          setTimeout(() => {
            deps.playSound('chips');
          }, 500);
        }
      }
    }

    // Update action timer if present in payload
    if ((payload as any).actionTimer !== undefined) {
      deps.setActionTimer((payload as any).actionTimer);
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
  playSound?: (sound: PokerSoundType) => void
) => {
  return (payload: any) => {
    updatePlayers(payload.players);

    // Update action history if provided
    if (payload.actionHistory) {
      setActionHistory(payload.actionHistory);

      // Play fold sound if the last action was a fold
      const lastAction = payload.actionHistory[payload.actionHistory.length - 1];
      if (lastAction?.actionType === 'PLAYER_FOLD' && playSound) {
        playSound('fold');
      }
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
  setStage: (stage: number) => void,
  updateBettingState: (pot: Bet[], playerBets: number[], currentPlayerIndex: number) => void,
  setActionHistory: (history: any[]) => void,
  playSound: (sound: PokerSoundType) => void
) => {
  return (payload: any) => {
    updatePlayers(payload.players); // Players now have dealt cards
    updateGameStatus(true, payload.lockTime, undefined);
    setStage(payload.stage);

    // Update betting state with blinds if present
    if (payload.pot !== undefined && payload.playerBets !== undefined) {
      updateBettingState(payload.pot, payload.playerBets, payload.currentPlayerIndex || 0);
    }

    // Update action history with blind bets if present
    if (payload.actionHistory !== undefined) {
      setActionHistory(payload.actionHistory);
    }

    // Play card deal sound when players receive their hole cards
    playSound('card-deal');
  };
};

export const createBetPlacedHandler = (
  updateBettingState: (pot: Bet[], playerBets: number[], currentPlayerIndex: number) => void,
  setActionHistory: (history: any[]) => void,
  setIsActionProcessing: (processing: boolean) => void,
  setPendingAction: (action: { type: 'bet' | 'fold' | 'call' | 'raise'; playerId: string } | null) => void,
  playSound: (sound: PokerSoundType) => void
) => {
  return (payload: any) => {
    updateBettingState(payload.pot, payload.playerBets, payload.currentPlayerIndex);

    // Update action history and play sound
    if (payload.actionHistory && payload.actionHistory.length > 0) {
      setActionHistory(payload.actionHistory);

      // Find the most recent PLAYER_BET action
      const lastBetAction = [...payload.actionHistory]
        .reverse()
        .find((action: any) => action.actionType === 'PLAYER_BET');

      if (lastBetAction) {
        // chipAmount might be 0, so we check for null/undefined specifically
        const chipAmount = lastBetAction.chipAmount;

        if (chipAmount !== undefined && chipAmount !== null) {
          // Simple sound logic:
          // - 0 chips = check
          // - Any chips = call/raise sound
          if (chipAmount === 0) {
            playSound('check');
          } else {
            playSound('call');
          }
        }
      }
    }

    // Clear action processing state (bet/call/raise actions trigger this event)
    setIsActionProcessing(false);
    setPendingAction(null);
  };
};

export const createCardsDealtHandler = (
  setStage: (stage: number) => void,
  setCommunalCards: (cards: Card[]) => void,
  updatePlayers?: (players: Player[]) => void,
  playSound?: (sound: PokerSoundType) => void
) => {
  return (payload: any) => {
    setStage(payload.stage);
    setCommunalCards(payload.communalCards);

    // Update players if included (e.g., when player cards are dealt after blind round)
    if (payload.players && updatePlayers) {
      updatePlayers(payload.players);
    }

    // Play card deal sound based on stage
    if (playSound) {
      // Stage 1 = Flop (3 cards), Stage 2 = Turn (1 card), Stage 3 = River (1 card)
      if (payload.stage === 2 || payload.stage === 3) {
        // Turn or River - single card
        playSound('single-card');
      } else {
        // Flop - multiple cards
        playSound('card-deal');
      }
    }
  };
};

export const createRoundCompleteHandler = (
  setWinner: (winner: any) => void,
  updatePlayers: (players: Player[]) => void,
  playSound?: (sound: PokerSoundType) => void
) => {
  return (payload: any) => {
    setWinner(payload.winner);
    updatePlayers(payload.players);

    // Play winner sound and chips sound when round completes
    if (playSound) {
      playSound('winner');
      // Delay chips sound slightly for better effect
      setTimeout(() => {
        playSound('chips');
      }, 500);
    }
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

export const createGameNotificationHandler = (
  setGameNotification: React.Dispatch<React.SetStateAction<any>>,
  playSound?: (sound: PokerSoundType) => void
) => {
  return (payload: any) => {
    const duration = payload.duration || 2000;
    const notification = {
      id: `${Date.now()}-${Math.random()}`,
      message: payload.message,
      type: payload.type,
      timestamp: Date.now(),
      duration: duration,
    };

    setGameNotification(notification);

    // Play sound based on notification type
    if (playSound) {
      switch (payload.type) {
        case 'blind':
          playSound('blind');
          break;
        case 'deal':
          // Play different sounds for single card vs multiple cards
          if (payload.message?.includes('turn') || payload.message?.includes('river')) {
            playSound('single-card');
          } else {
            playSound('card-deal');
          }
          break;
        case 'action':
          // Action sounds are handled by other handlers
          break;
      }
    }

    // Auto-clear notification after duration
    setTimeout(() => {
      setGameNotification((current: any) => {
        // Only clear if it's still the same notification
        if (current?.id === notification.id) {
          return null;
        }
        return current;
      });
    }, duration);
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
    handleGameNotification: (payload: any) => void;
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
  socket.on(SOCKET_EVENTS.POKER_GAME_NOTIFICATION, handlers.handleGameNotification);

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
    socket.off(SOCKET_EVENTS.POKER_GAME_NOTIFICATION, handlers.handleGameNotification);
  };
};
