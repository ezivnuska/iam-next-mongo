// app/lib/providers/poker-provider.tsx

'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import type { GameState, Player, Card, Bet } from '@/app/lib/definitions/poker';
import { GameStage } from '@/app/lib/definitions/poker';
import { useSocket } from './socket-provider';
import { SOCKET_EVENTS } from '@/app/lib/socket/events';
import type { PokerStateUpdatePayload } from '@/app/lib/socket/events';

interface PokerContextValue extends GameState {
  gameId: string | null;
  availableGames: Array<{ id: string; code: string }>;
  currentPlayerIndex: number;
  createAndJoinGame: () => Promise<void>;
  joinGame: (gameId: string) => Promise<void>;
  deal: () => Promise<void>;
  restart: () => Promise<void>;
  placeBet: (chipCount: number) => Promise<void>;
}

const PokerContext = createContext<PokerContextValue | undefined>(undefined);

const stages: GameStage[] = [
  GameStage.Cards,
  GameStage.Flop,
  GameStage.Turn,
  GameStage.River,
];

export function PokerProvider({ children }: { children: ReactNode }) {
  const { socket } = useSocket();

  // --- Game state (synced from server) ---
  const [players, setPlayers] = useState<Player[]>([]);
  const [deck, setDeck] = useState<Card[]>([]);
  const [communalCards, setCommunalCards] = useState<Card[]>([]);
  const [pot, setPot] = useState<Bet[]>([]);
  const [stage, setStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [currentPlayerIndex, setCurrentPlayerIndex] = useState(0);
  const [gameId, setGameId] = useState<string | null>(null);
  const [availableGames, setAvailableGames] = useState<Array<{ id: string; code: string }>>([]);

  // --- Sync updates from server socket ---
  const updateGameState = useCallback((state: PokerStateUpdatePayload) => {
    setPlayers(state.players);
    setDeck(state.deck);
    setCommunalCards(state.communalCards);
    setPot(state.pot);
    setStage(state.stage);
    setPlaying(state.playing);
    setCurrentPlayerIndex(state.currentPlayerIndex || 0);
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleStateUpdate = (payload: PokerStateUpdatePayload) => {
      updateGameState(payload);
    };

    const handleGameCreated = (payload: any) => {
      const newGame = { id: payload.gameId || payload._id?.toString(), code: payload.game?.code || payload.code };
      setAvailableGames(prev => {
        // Avoid duplicates
        if (prev.some(g => g.id === newGame.id)) return prev;
        return [...prev, newGame];
      });
    };

    socket.on(SOCKET_EVENTS.POKER_STATE_UPDATE, handleStateUpdate);
    socket.on(SOCKET_EVENTS.POKER_GAME_CREATED, handleGameCreated);

    return () => {
      socket.off(SOCKET_EVENTS.POKER_STATE_UPDATE, handleStateUpdate);
      socket.off(SOCKET_EVENTS.POKER_GAME_CREATED, handleGameCreated);
    };
  }, [socket, updateGameState]);

  // --- API Actions ---
  const createAndJoinGame = useCallback(async () => {
    try {
      // Create new game
      const createRes = await fetch('/api/poker/create', { method: 'POST' });
      const createData = await createRes.json();

      if (!createData?.gameId) {
        console.error('Failed to create game:', createData);
        return;
      }

      const newGameId = createData.gameId;
      setGameId(newGameId);
      console.log('Created new game ID:', newGameId);

      // Join the game
      const joinRes = await fetch('/api/poker/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: newGameId }),
      });

      if (!joinRes.ok) {
        console.error('Failed to join newly created game');
      }
    } catch (error) {
      console.error('Error creating and joining game:', error);
    }
  }, []);

  const joinGame = useCallback(async (gameId: string) => {
    try {
      setGameId(gameId);
      const response = await fetch('/api/poker/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });
      if (!response.ok) console.error('Failed to join game');
    } catch (error) {
      console.error('Error joining game:', error);
    }
  }, []);

  const deal = useCallback(async () => {
    if (!gameId) return;
    try {
      const response = await fetch('/api/poker/deal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        console.error('Failed to deal cards:', errorData);
      }
    } catch (error) {
      console.error('Error dealing cards:', error);
    }
  }, [gameId]);

  const placeBet = useCallback(
    async (chipCount: number = 1) => {
      if (!gameId) return;
      try {
        const response = await fetch('/api/poker/bet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameId, chipCount }),
        });
        if (!response.ok) console.error('Failed to place bet');
      } catch (error) {
        console.error('Error placing bet:', error);
      }
    },
    [gameId]
  );

  const restart = useCallback(async () => {
    if (!gameId) return;
    try {
      const response = await fetch('/api/poker/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });
      if (!response.ok) console.error('Failed to restart game');
    } catch (error) {
      console.error('Error restarting game:', error);
    }
  }, [gameId]);

  // --- Provide state + actions ---
  const value: PokerContextValue = {
    players,
    deck,
    communalCards,
    pot,
    stage,
    stages,
    playing,
    currentPlayerIndex,
    gameId,
    availableGames,
    createAndJoinGame,
    joinGame,
    deal,
    restart,
    placeBet,
  };

  return <PokerContext.Provider value={value}>{children}</PokerContext.Provider>;
}

export function usePoker() {
  const context = useContext(PokerContext);
  if (!context) {
    throw new Error('usePoker must be used within a PokerProvider');
  }
  return context;
}
