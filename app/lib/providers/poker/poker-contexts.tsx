// app/lib/providers/poker/poker-contexts.tsx

'use client';

import { createContext } from 'react';
import type { GameStageProps, Player, Card, Bet } from '@/app/lib/definitions/poker';

// ============= Context Interfaces =============

export interface GameStateContextValue {
  stage: number;
  stages: GameStageProps[];
  locked: boolean;
  lockTime?: string;
  currentPlayerIndex: number;
  currentBet: number;
  playerBets: number[];
  communalCards: Card[];
  deck: Card[];
  winner?: {
    winnerId: string;
    winnerName: string;
    handRank: string;
    isTie: boolean;
    tiedPlayers?: string[];
  };
  // Server-synced timer state
  actionTimer?: {
    startTime: string;         // ISO timestamp
    duration: number;          // Duration in seconds
    currentActionIndex: number;
    totalActions: number;
    actionType: string;
    targetPlayerId?: string;
    isPaused: boolean;
  };
  restartCountdown: number | null;
  actionHistory: any[];
  isLoading: boolean;
}

export interface PotContextValue {
  pot: Bet[];
  potTotal: number;
  playerContributions: Record<string, number>; // username -> total contribution
}

export interface PlayersContextValue {
  players: Player[];
}

export interface ViewersContextValue {
  gameId: string | null;
  availableGames: Array<{ id: string; code: string; creatorId: string | null }>;
}

export interface ActionsContextValue {
  joinGame: (gameId: string) => Promise<void>;
  restart: () => Promise<void>;
  placeBet: (chipCount: number) => Promise<void>;
  fold: () => Promise<void>;
  leaveGame: () => Promise<void>;
  deleteGameFromLobby: (gameId: string) => Promise<void>;
  fetchCurrentGame: () => void;
  startTimer: () => Promise<void>;
  pauseTimer: () => Promise<void>;
  resumeTimer: () => Promise<void>;
  forceLockGame: () => Promise<void>;
}

// ============= Create Contexts =============

export const GameStateContext = createContext<GameStateContextValue | undefined>(undefined);
export const PotContext = createContext<PotContextValue | undefined>(undefined);
export const PlayersContext = createContext<PlayersContextValue | undefined>(undefined);
export const ViewersContext = createContext<ViewersContextValue | undefined>(undefined);
export const ActionsContext = createContext<ActionsContextValue | undefined>(undefined);
