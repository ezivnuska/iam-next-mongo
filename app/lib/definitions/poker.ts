// app/lib/definitions/poker.ts

import type { GameActionType } from './game-actions';

export type Suit = 'hearts' | 'clubs' | 'diamonds' | 'spades';

export interface Card {
  id: string;
  type: number;
  suit: Suit;
  color: string;
  label: string;
  symbol: string;
}

export interface GameStageProps {
  players: Player[];
  bets: Bet[];
}

export interface Chip {
  id: string;
  value: number;
}

export interface Bet {
  player: string;
  chips: Chip[];
}

export interface Player {
  id: string;
  username: string;
  hand: Card[];
  chips: Chip[];
}

export enum GameStage {
  Preflop = 0,
  Flop = 1,
  Turn = 2,
  River = 3,
}

/**
 * Information about the game winner
 */
export interface WinnerInfo {
  winnerId: string;
  winnerName: string;
  handRank: string;
  isTie: boolean;
  tiedPlayers?: string[];
}

/**
 * Action timer state for tracking turn timers
 */
export interface ActionTimer {
  startTime: Date;
  duration: number;
  currentActionIndex: number;
  totalActions: number;
  actionType: GameActionType;
  targetPlayerId?: string;
  isPaused: boolean;
  selectedAction?: 'fold' | 'call' | 'check' | 'bet' | 'raise';
}

/**
 * Serialized action timer for API/socket transmission
 */
export interface SerializedActionTimer extends Omit<ActionTimer, 'startTime' | 'actionType'> {
  startTime: string; // ISO string
  actionType: string; // String representation
}

/**
 * Complete poker game document (MongoDB model)
 */
export interface PokerGameDocument {
  _id: string;
  code: string;
  players: Player[];
  deck: Card[];
  communalCards: Card[];
  pot: Bet[];
  stage: number;
  locked: boolean;
  lockTime?: Date;
  processing: boolean; // Distributed lock for concurrent operations
  currentPlayerIndex: number;
  playerBets: number[];
  stages: GameStageProps[];
  winner?: WinnerInfo;
  actionTimer?: ActionTimer;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Serialized game state for API responses and socket events
 */
export interface SerializedGameState extends Omit<PokerGameDocument, 'lockTime' | 'createdAt' | 'updatedAt' | 'actionTimer'> {
  lockTime?: string;
  createdAt: string;
  updatedAt: string;
  actionTimer?: SerializedActionTimer;
}

/**
 * Basic game state (for client-side state management)
 */
export interface GameState {
  players: Player[];
  deck: Card[];
  communalCards: Card[];
  pot: Bet[];
  stage: number;
  stages: GameStageProps[];
  locked: boolean;
  playerBets: number[];
}
