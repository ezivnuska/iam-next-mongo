// app/lib/models/poker-game.ts

import mongoose, { Schema, model, models, Document } from 'mongoose';
import type { Card, Bet, Player, GameStageProps, PotInfo } from '@/app/poker/lib/definitions/poker';
import { GameStage, StageStatus } from '@/app/poker/lib/definitions/poker';
import type { GameActionHistory } from '@/app/poker/lib/definitions/action-history';

/**
 * PokerGame Schema
 */
export interface PokerGameDocument extends Document {
  code: string;
  players: Player[];
  deck: Card[];
  communalCards: Card[];
  pot: Bet[];                   // Legacy single pot (for backward compatibility)
  pots?: PotInfo[];             // NEW: Multiple pots for all-in scenarios
  stage: GameStage | number; // Stored as number in DB
  stageStatus?: StageStatus;    // NEW: Track stage lifecycle position
  locked: boolean; // Whether game is in progress (locked from new joins)
  lockTime?: Date; // When game will auto-lock
  processing: boolean; // Distributed lock for concurrent operations
  processingStartedAt?: Date; // Timestamp when processing lock was acquired
  currentPlayerIndex: number; // Index of current player in players array
  dealerButtonPosition: number; // Index of player with dealer button (rotates each hand)
  playerBets: number[]; // Each player's total bet in current round
  stages: GameStageProps[]; // History of completed betting rounds
  actionHistory: GameActionHistory[]; // Sequential log of all game actions
  winner?: {
    winnerId: string;
    winnerName: string;
    handRank: string;
    isTie: boolean;
    tiedPlayers?: string[];
  };
  // NEW: Step-based flow tracking
  currentStep?: {
    stageNumber: number;
    stepNumber: number;
    stepId: string;
    startedAt: Date;
    completedRequirements: string[];  // Array of completed requirement types
  };
  // Server-side timer state (timestamp-based for client synchronization)
  actionTimer?: {
    startTime: Date;           // When current action started
    duration: number;          // Action duration in seconds
    currentActionIndex: number;
    totalActions: number;
    actionType: string;        // Type of current action (e.g., 'PLAYER_BET', 'DEAL_CARDS')
    targetPlayerId?: string;   // Player whose turn it is (for bet actions)
    isPaused: boolean;
    selectedAction?: 'fold' | 'call' | 'check' | 'bet' | 'raise'; // Player's pre-selected action on timer expiry
    selectedBetAmount?: number; // Player's selected bet amount for bet/raise actions
  };
  // NEW: Track what needs to happen before advancing
  stageCompletionChecks?: {
    bettingComplete: boolean;
    cardsDealt: boolean;
    notificationsSent: boolean;
  };
  // NEW: Track if game is in auto-advance mode (all players all-in)
  autoAdvanceMode?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CardSchema = new Schema<Card>(
  {
    type: { type: Number, required: true },
    suit: {
      type: String,
      enum: ['hearts', 'clubs', 'diamonds', 'spades'],
      required: true,
    },
    label: { type: String, required: true },
    symbol: { type: String, required: true },
    color: { type: String, required: true },
  },
  { _id: false }
);

const PlayerSchema = new Schema<Player>(
  {
    id: { type: String, required: true },
    username: { type: String, required: true },
    hand: { type: [CardSchema], default: [] },
    chipCount: { type: Number, required: true, default: 0 },
    lastHeartbeat: { type: Date, required: false },
    folded: { type: Boolean, required: false },
    isAllIn: { type: Boolean, required: false },
    allInAmount: { type: Number, required: false },
    isAI: { type: Boolean, required: false, default: false },
    isAway: { type: Boolean, required: false, default: false },
  },
  { _id: false }
);

const BetSchema = new Schema<Bet>(
  {
    player: { type: String, required: true },
    chipCount: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const GameStagePropsSchema = new Schema<GameStageProps>(
  {
    players: { type: [PlayerSchema], required: true },
    bets: { type: [BetSchema], required: true },
  },
  { _id: false }
);

const ActionHistorySchema = new Schema<GameActionHistory>(
  {
    id: { type: String, required: true },
    timestamp: { type: Date, required: true },
    stage: { type: Number, required: true },
    actionType: { type: String, required: true },
    playerId: { type: String, required: false },
    playerName: { type: String, required: false },
    chipAmount: { type: Number, required: false },
    cardsDealt: { type: Number, required: false },
    fromStage: { type: Number, required: false },
    toStage: { type: Number, required: false },
    winnerId: { type: String, required: false },
    winnerName: { type: String, required: false },
  },
  { _id: false }
);

const PotInfoSchema = new Schema(
  {
    amount: { type: Number, required: true },
    eligiblePlayers: { type: [String], required: true },
    contributions: { type: Map, of: Number, default: {} },
  },
  { _id: false }
);

const PokerGameSchema = new Schema<PokerGameDocument>(
  {
    code: { type: String, required: true, unique: true },
    players: { type: [PlayerSchema], default: [] },
    deck: { type: [CardSchema], default: [] },
    communalCards: { type: [CardSchema], default: [] },
    pot: { type: [BetSchema], default: [] },
    pots: { type: [PotInfoSchema], required: false }, // NEW: Multiple pots for all-in scenarios

    // Store as Number (0, 1, 2, 3, 4, 5) to match GameStage enum values
    stage: {
      type: Number,
      enum: [GameStage.Preflop, GameStage.Flop, GameStage.Turn, GameStage.River, GameStage.Showdown, GameStage.End],
      default: GameStage.Preflop, // Games start at Preflop stage (0)
    },

    // NEW: Track stage lifecycle position
    stageStatus: {
      type: String,
      enum: [
        StageStatus.NOT_STARTED,
        StageStatus.ENTERING,
        StageStatus.ACTIVE,
        StageStatus.COMPLETING,
        StageStatus.COMPLETE
      ],
      default: StageStatus.ACTIVE,
      required: false,
    },

    // NEW: Track what needs to happen before advancing
    stageCompletionChecks: {
      type: {
        bettingComplete: { type: Boolean, default: false },
        cardsDealt: { type: Boolean, default: false },
        notificationsSent: { type: Boolean, default: false },
      },
      required: false,
    },

    // NEW: Track if game is in auto-advance mode (all players all-in)
    autoAdvanceMode: { type: Boolean, default: false, required: false },

    locked: { type: Boolean, default: false },
    lockTime: { type: Date, required: false },
    processing: { type: Boolean, default: false }, // Distributed lock for concurrent operations
    processingStartedAt: { type: Date, required: false }, // Timestamp when processing lock was acquired
    currentPlayerIndex: { type: Number, default: 0 },
    dealerButtonPosition: { type: Number, default: 0 }, // Rotates each hand
    playerBets: { type: [Number], default: [] },
    stages: { type: [GameStagePropsSchema], default: [] },
    actionHistory: { type: [ActionHistorySchema], default: [] },
    winner: {
      type: {
        winnerId: String,
        winnerName: String,
        handRank: String,
        isTie: Boolean,
        tiedPlayers: [String],
      },
      required: false,
    },
    currentStep: {
      type: {
        stageNumber: Number,
        stepNumber: Number,
        stepId: String,
        startedAt: Date,
        completedRequirements: [String],
      },
      required: false,
    },
    actionTimer: {
      type: {
        startTime: Date,
        duration: Number,
        currentActionIndex: Number,
        totalActions: Number,
        actionType: String,
        targetPlayerId: String,
        isPaused: Boolean,
        selectedAction: {
          type: String,
          enum: ['fold', 'call', 'check', 'bet', 'raise'],
          required: false,
        },
        selectedBetAmount: {
          type: Number,
          required: false,
        },
      },
      required: false,
    },
  },
  {
    timestamps: true,
    optimisticConcurrency: true,  // Enable optimistic concurrency control
    strict: true,  // Reject fields not in schema
    strictQuery: true  // Apply strict mode to queries
  }
);


export const PokerGame =
  models.PokerGame || model<PokerGameDocument>('PokerGame', PokerGameSchema);
