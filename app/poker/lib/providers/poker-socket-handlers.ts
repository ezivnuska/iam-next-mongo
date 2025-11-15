// app/lib/providers/poker/poker-socket-handlers.ts

import type { Socket } from 'socket.io-client';
import type { Player, Card, Bet } from '@/app/poker/lib/definitions/poker';
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
  userId?: string | null;
}

export const createStateUpdateHandler = (deps: SocketHandlerDeps) => {
  return (payload: PokerStateUpdatePayload) => {
    const currentState = deps.stateRef.current;

    console.log('[StateUpdateHandler] Received state update:', {
      playersCount: payload.players?.length,
      allInPlayers: payload.players?.filter(p => p.isAllIn).map(p => p.username)
    });

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
          // Only play sound if this fold was NOT from the current user
          const isActingPlayer = deps.userId && secondLastAction.playerId === deps.userId;
          if (!isActingPlayer) {
            deps.playSound('fold');
          } else {
            console.log('[StateUpdateHandler] Skipping fold sound for acting player (already played optimistically)');
          }
        }

        // NOTE: Winner sounds are now played when the winner notification is displayed
        // This ensures sounds play at the same time as the visual notification
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
  userId?: string | null
) => {
  return (payload: any) => {
    updatePlayers(payload.players);

    // Update action history if provided
    if (payload.actionHistory) {
      setActionHistory(payload.actionHistory);

      // Play fold sound if the last action was a fold
      const lastAction = payload.actionHistory[payload.actionHistory.length - 1];
      if (lastAction?.actionType === 'PLAYER_FOLD' && playSound) {
        // Only play sound if this fold was NOT from the current user
        const isActingPlayer = userId && lastAction.playerId === userId;
        if (!isActingPlayer) {
          playSound('fold');
        } else {
          console.log('[PlayerLeftHandler] Skipping fold sound for acting player (already played optimistically)');
        }
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
    updatePlayers(payload.players); // Players with empty hands (cards dealt later)
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

    // Note: Card deal sound will play when POKER_CARDS_DEALT event is received
  };
};

export const createBetPlacedHandler = (
  updateBettingState: (pot: Bet[], playerBets: number[], currentPlayerIndex: number) => void,
  setActionHistory: (history: any[]) => void,
  setIsActionProcessing: (processing: boolean) => void,
  setPendingAction: (action: { type: 'bet' | 'fold' | 'call' | 'raise'; playerId: string } | null) => void,
  playSound: (sound: PokerSoundType) => void,
  updatePlayers?: (players: Player[]) => void,
  userId?: string | null
) => {
  return (payload: any) => {
    updateBettingState(payload.pot, payload.playerBets, payload.currentPlayerIndex);

    // Update players if provided (for chip count and all-in status changes)
    if (payload.players && updatePlayers) {
      // Log all-in status for debugging
      const allInPlayers = payload.players.filter((p: Player) => p.isAllIn);
      if (allInPlayers.length > 0) {
        console.log('[BetPlacedHandler] Players with ALL-IN status:', allInPlayers.map((p: Player) => ({
          username: p.username,
          isAllIn: p.isAllIn,
          chipCount: p.chipCount
        })));
      }
      updatePlayers(payload.players);
    }

    // Update action history and play sound
    if (payload.actionHistory && payload.actionHistory.length > 0) {
      setActionHistory(payload.actionHistory);

      // Find the most recent PLAYER_BET action
      const lastBetAction = [...payload.actionHistory]
        .reverse()
        .find((action: any) => action.actionType === 'PLAYER_BET');

      if (lastBetAction) {
        // Only play sound if this action was NOT from the current user
        // (acting player already heard the sound optimistically)
        const isActingPlayer = userId && lastBetAction.playerId === userId;

        if (!isActingPlayer) {
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
        } else {
          console.log('[BetPlacedHandler] Skipping sound for acting player (already played optimistically)');
        }
      }
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
    console.log('[CardsDealtHandler] Received cards dealt event:', {
      stage: payload.stage,
      communalCardsCount: payload.communalCards?.length,
      playersCount: payload.players?.length,
      currentPlayerIndex: payload.currentPlayerIndex
    });

    // Update current player index immediately
    if (payload.currentPlayerIndex !== undefined && setCurrentPlayerIndex) {
      console.log('[CardsDealtHandler] Updating current player index to:', payload.currentPlayerIndex);
      setCurrentPlayerIndex(payload.currentPlayerIndex);
    }

    // Update players immediately (hands, chips, all-in status)
    if (payload.players && updatePlayers) {
      console.log('[CardsDealtHandler] Updating player state immediately');
      const allInPlayers = payload.players.filter((p: Player) => p.isAllIn);
      if (allInPlayers.length > 0) {
        console.log('[CardsDealtHandler] Players with ALL-IN status:', allInPlayers.map((p: Player) => ({
          username: p.username,
          isAllIn: p.isAllIn,
          chipCount: p.chipCount
        })));
      }
      updatePlayers(payload.players);
    }

    // Route stage and communal cards through the coordinated update system
    // This will queue the notification and delay the card display until notification completes
    console.log('[CardsDealtHandler] Routing stage/card update through coordinator');
    updateStageState(
      payload.stage,
      payload.communalCards || [],
      payload.deck || [],
      payload.stages
    );

    // NOTE: Sound is now played by the stage coordinator when stage is actually updated
    // This ensures sound plays at the same time cards are displayed to the user
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
    console.log('[RoundCompleteHandler] Round complete event received:', {
      hasWinner: !!payload.winner,
      winner: payload.winner,
      hasShowNotification: !!showNotification,
      gameId: gameId,
    });

    setWinner(payload.winner);
    updatePlayers(payload.players);

    // If winner is cleared (undefined), game has been reset and is ready to restart
    // Show "Game starting!" notification (10 second countdown) then trigger game lock
    if (!payload.winner && showNotification && gameId) {
      console.log('[RoundCompleteHandler] ✅ Conditions met - showing game starting notification with 10s countdown');
      const { POKER_GAME_CONFIG } = require('../config/poker-constants');
      showNotification({
        message: 'Game starting!',
        type: 'info',
        duration: POKER_GAME_CONFIG.AUTO_LOCK_DELAY_MS, // 10 seconds
        onComplete: async () => {
          console.log('[RoundCompleteHandler] ✅ Game starting notification complete - triggering game lock');
          try {
            const response = await fetch('/api/poker/lock', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ gameId }),
            });
            console.log('[RoundCompleteHandler] ✅ Game lock API response:', response.status, response.statusText);
          } catch (error) {
            console.error('[RoundCompleteHandler] ❌ Failed to trigger game lock:', error);
          }
        },
      });
    } else {
      console.log('[RoundCompleteHandler] ❌ Conditions NOT met for restart notification:', {
        noWinner: !payload.winner,
        hasShowNotification: !!showNotification,
        hasGameId: !!gameId,
      });
    }

    // NOTE: Winner sounds are now played when the winner notification is displayed
    // This ensures sounds play at the same time as the visual notification
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
