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

/**
 * @deprecated Chips are now represented as simple numbers (chipCount)
 * This interface is kept for backward compatibility during migration
 */
export interface Chip {
  id: string;
  value: number;
}

export interface Bet {
  player: string;
  chipCount: number;
}

/**
 * Represents a pot (main or side) with eligible players
 */
export interface PotInfo {
  amount: number;                    // Total chips in this pot
  eligiblePlayers: string[];         // Player IDs who can win this pot
  contributions: {                    // Track each player's contribution to this pot
    [playerId: string]: number;
  };
}

export interface Player {
  id: string;
  username: string;
  hand: Card[];
  chipCount: number;
  lastHeartbeat?: Date;
  folded?: boolean;
  isAllIn?: boolean;        // Player has bet all their chips
  allInAmount?: number;     // Total amount player went all-in for (in chip count)
  isAI?: boolean;           // Whether this is an AI player
  isAway?: boolean;         // Player has navigated away from the /poker route
}

export enum GameStage {
  Preflop = 0,    // Post blinds, deal hole cards, first betting round
  Flop = 1,       // Deal 3 community cards, betting round
  Turn = 2,       // Deal 1 community card, betting round
  River = 3,      // Deal 1 community card, betting round
  Showdown = 4,   // Determine winner
  End = 5,        // Game over
}

/**
 * Stage lifecycle status - tracks where we are in the stage flow
 * Prevents stages from advancing before completing current stage
 */
export enum StageStatus {
  NOT_STARTED = 'not_started',   // Stage hasn't begun yet
  ENTERING = 'entering',          // Dealing cards, sending notifications
  ACTIVE = 'active',              // Betting in progress
  COMPLETING = 'completing',      // Round complete, finalizing
  COMPLETE = 'complete'           // Ready to advance to next stage
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
  potWinnings?: {              // NEW: Track winnings from each pot
    potIndex: number;
    amount: number;
  }[];
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
  pot: Bet[];                       // Legacy single pot (for backward compatibility)
  pots?: PotInfo[];                 // NEW: Multiple pots for all-in scenarios
  stage: number;
  stageStatus?: StageStatus;        // NEW: Track stage lifecycle position
  locked: boolean;
  lockTime?: Date;
  processing: boolean; // Distributed lock for concurrent operations
  currentPlayerIndex: number;
  playerBets: number[];
  stages: GameStageProps[];
  winner?: WinnerInfo;
  actionTimer?: ActionTimer;

  // NEW: Track what needs to happen before advancing
  stageCompletionChecks?: {
    bettingComplete: boolean;
    cardsDealt: boolean;
    notificationsSent: boolean;
  };

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
  stageStatus?: StageStatus;  // NEW: Track stage lifecycle
  stages: GameStageProps[];
  locked: boolean;
  playerBets: number[];
}
