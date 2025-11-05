// app/lib/providers/poker/poker-contexts.tsx

'use client';

import { createContext } from 'react';
import type { GameStageProps, Player, Card, Bet } from '@/app/poker/lib/definitions/poker';
import type { PokerSoundType } from '../hooks/use-poker-sounds';

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
  gameNotification: {
    id: string;
    message: string;
    type: 'blind' | 'deal' | 'action' | 'info';
    timestamp: number;
    duration?: number;
  } | null;
  selectedAction: 'bet' | 'call' | 'raise' | 'fold' | 'check' | 'allin' | null;
  setSelectedAction: (action: 'bet' | 'call' | 'raise' | 'fold' | 'check' | 'allin' | null) => void;
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
  clearTimer: () => Promise<void>;
  forceLockGame: () => Promise<void>;
  setTurnTimerAction: (action: 'fold' | 'call' | 'check' | 'bet' | 'raise', betAmount?: number) => Promise<void>;
  clearTimerOptimistically: () => void;
  playSound: (type: PokerSoundType) => void;
}

export interface ProcessingContextValue {
  isActionProcessing: boolean;
  pendingAction: {
    type: 'bet' | 'fold' | 'call' | 'raise';
    playerId: string;
  } | null;
}

// ============= Create Contexts =============

export const GameStateContext = createContext<GameStateContextValue | undefined>(undefined);
export const PotContext = createContext<PotContextValue | undefined>(undefined);
export const PlayersContext = createContext<PlayersContextValue | undefined>(undefined);
export const ViewersContext = createContext<ViewersContextValue | undefined>(undefined);
export const ActionsContext = createContext<ActionsContextValue | undefined>(undefined);
export const ProcessingContext = createContext<ProcessingContextValue | undefined>(undefined);
