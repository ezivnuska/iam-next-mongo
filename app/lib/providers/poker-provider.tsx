// app/lib/providers/poker-provider.tsx

'use client';

import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import type { GameState, Player, Card, Bet } from '@/app/lib/definitions/poker';
import { GameStage } from '@/app/lib/definitions/poker';
import { useSocket } from './socket-provider';
import { SOCKET_EVENTS } from '@/app/lib/socket/events';
import type { PokerStateUpdatePayload, PokerGameDeletedPayload } from '@/app/lib/socket/events';

interface PokerContextValue extends GameState {
  gameId: string | null;
  availableGames: Array<{ id: string; code: string; creatorId: string | null }>;
  currentPlayerIndex: number;
  winner?: {
    winnerId: string;
    winnerName: string;
    handRank: string;
    isTie: boolean;
    tiedPlayers?: string[];
  };
  createAndJoinGame: () => Promise<void>;
  joinGame: (gameId: string) => Promise<void>;
  deal: () => Promise<void>;
  restart: () => Promise<void>;
  placeBet: (chipCount: number) => Promise<void>;
  fold: () => Promise<void>;
  leaveGame: () => Promise<void>;
  deleteGameFromLobby: (gameId: string) => Promise<void>;
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
  const [playerBets, setPlayerBets] = useState<number[]>([]);
  const [winner, setWinner] = useState<{
    winnerId: string;
    winnerName: string;
    handRank: string;
    isTie: boolean;
    tiedPlayers?: string[];
  }>();
  const [gameId, setGameId] = useState<string | null>(null);
  const [availableGames, setAvailableGames] = useState<Array<{ id: string; code: string; creatorId: string | null }>>([]);

  // --- Sync updates from server socket ---
  const updateGameState = useCallback((state: PokerStateUpdatePayload) => {
    setPlayers(state.players);
    setDeck(state.deck);
    setCommunalCards(state.communalCards);
    setPot(state.pot);
    setStage(state.stage);
    setPlaying(state.playing);
    setCurrentPlayerIndex(state.currentPlayerIndex || 0);
    setPlayerBets(state.playerBets || []);
    setWinner(state.winner);
  }, []);

  // Fetch existing games on mount
  useEffect(() => {
    const fetchGames = async () => {
      try {
        const response = await fetch('/api/poker/games');
        if (response.ok) {
          const data = await response.json();
          setAvailableGames(data.games || []);
        }
      } catch (error) {
        console.error('Error fetching games:', error);
      }
    };

    fetchGames();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleStateUpdate = (payload: PokerStateUpdatePayload) => {
      updateGameState(payload);
    };

    const handleGameCreated = (payload: any) => {
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

    const handleGameDeleted = (payload: PokerGameDeletedPayload) => {
        console.log('game deleted:', payload)
        setAvailableGames(prev => prev.filter(g => g.id !== payload.gameId));
    };

    const handlePlayerJoined = (payload: any) => {
        setPlayers(prev => [ ...prev, payload ]);
    };

    const handlePlayerLeft = (payload: any) => {
        setPlayers(prev => prev.filter(p => p.id !== payload.id));
    };

    socket.on(SOCKET_EVENTS.POKER_STATE_UPDATE, handleStateUpdate);
    socket.on(SOCKET_EVENTS.POKER_GAME_CREATED, handleGameCreated);
    socket.on(SOCKET_EVENTS.POKER_GAME_DELETED, handleGameDeleted);
    socket.on(SOCKET_EVENTS.POKER_PLAYER_JOINED, handlePlayerJoined);
    socket.on(SOCKET_EVENTS.POKER_PLAYER_LEFT, handlePlayerLeft);

    return () => {
      socket.off(SOCKET_EVENTS.POKER_STATE_UPDATE, handleStateUpdate);
      socket.off(SOCKET_EVENTS.POKER_GAME_CREATED, handleGameCreated);
    };
  }, [socket]);

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

  const fold = useCallback(async () => {
    if (!gameId) return;
    try {
      const response = await fetch('/api/poker/fold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });
      if (!response.ok) console.error('Failed to fold');
    } catch (error) {
      console.error('Error folding:', error);
    }
  }, [gameId]);

  const leaveGame = useCallback(async () => {
    if (!gameId) return;
    try {
      const response = await fetch('/api/poker/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId }),
      });
      if (response.ok) {
        // Reset game state and return to lobby
        setGameId(null);
        setPlayers([]);
        setDeck([]);
        setCommunalCards([]);
        setPot([]);
        setStage(0);
        setPlaying(false);
        setCurrentPlayerIndex(0);
        setPlayerBets([]);
        setWinner(undefined);
        // Remove game from available games
        setAvailableGames(prev => prev.filter(g => g.id !== gameId));
      } else {
        console.error('Failed to leave game');
      }
    } catch (error) {
      console.error('Error leaving game:', error);
    }
  }, [gameId]);

  const deleteGameFromLobby = useCallback(async (gameIdToDelete: string) => {
    try {
      const response = await fetch('/api/poker/delete', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gameId: gameIdToDelete }),
      });
      if (response.ok) {
        // Remove game from available games list
        setAvailableGames(prev => prev.filter(g => g.id !== gameIdToDelete));
      } else {
        console.error('Failed to delete game from lobby');
      }
    } catch (error) {
      console.error('Error deleting game from lobby:', error);
    }
  }, []);

  // --- Provide state + actions ---
  const value: PokerContextValue = {
    players,
    deck,
    communalCards,
    pot,
    stage,
    stages,
    playing,
    playerBets,
    currentPlayerIndex,
    winner,
    gameId,
    availableGames,
    createAndJoinGame,
    joinGame,
    deal,
    restart,
    placeBet,
    fold,
    leaveGame,
    deleteGameFromLobby,
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
