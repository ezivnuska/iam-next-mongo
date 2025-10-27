// app/lib/models/poker-game.ts

import mongoose, { Schema, model, models, Document } from 'mongoose';
import type { Card, Bet, Player, GameStageProps } from '@/app/lib/definitions/poker';
import { GameStage } from '@/app/lib/definitions/poker';
import type { GameActionHistory } from '@/app/lib/definitions/action-history';

/**
 * PokerGame Schema
 */
export interface PokerGameDocument extends Document {
  code: string;
  players: Player[];
  deck: Card[];
  communalCards: Card[];
  pot: Bet[];
  stage: GameStage | number; // Stored as number in DB
  locked: boolean; // Whether game is in progress (locked from new joins)
  lockTime?: Date; // When game will auto-lock
  processing: boolean; // Distributed lock for concurrent operations
  currentPlayerIndex: number; // Index of current player in players array
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
  // Server-side timer state (timestamp-based for client synchronization)
  actionTimer?: {
    startTime: Date;           // When current action started
    duration: number;          // Action duration in seconds
    currentActionIndex: number;
    totalActions: number;
    actionType: string;        // Type of current action (e.g., 'PLAYER_BET', 'DEAL_CARDS')
    targetPlayerId?: string;   // Player whose turn it is (for bet actions)
    isPaused: boolean;
  };
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

const ChipSchema = new Schema(
  {
    value: { type: Number, required: true },
  },
  { _id: false }
);

const PlayerSchema = new Schema<Player>(
  {
    id: { type: String, required: true },
    username: { type: String, required: true },
    hand: { type: [CardSchema], default: [] },
    chips: { type: [ChipSchema], default: [] },
  },
  { _id: false }
);

const BetSchema = new Schema<Bet>(
  {
    player: { type: String, required: true },
    chips: { type: [ChipSchema], default: [] },
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

const PokerGameSchema = new Schema<PokerGameDocument>(
  {
    code: { type: String, required: true, unique: true },
    players: { type: [PlayerSchema], default: [] },
    deck: { type: [CardSchema], default: [] },
    communalCards: { type: [CardSchema], default: [] },
    pot: { type: [BetSchema], default: [] },

    // Store as Number (0, 1, 2, 3) to match GameStage enum values
    stage: {
      type: Number,
      enum: [GameStage.Preflop, GameStage.Flop, GameStage.Turn, GameStage.River],
      default: GameStage.Preflop,
    },

    locked: { type: Boolean, default: false },
    lockTime: { type: Date, required: false },
    processing: { type: Boolean, default: false }, // Distributed lock for concurrent operations
    currentPlayerIndex: { type: Number, default: 0 },
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
    actionTimer: {
      type: {
        startTime: Date,
        duration: Number,
        currentActionIndex: Number,
        totalActions: Number,
        actionType: String,
        targetPlayerId: String,
        isPaused: Boolean,
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

// Add middleware to log all saves for debugging concurrent modifications
PokerGameSchema.pre('save', function(next) {
  const stack = new Error().stack;
  const callerLine = stack?.split('\n')[3]?.trim() || 'unknown';

  console.log('[Mongoose Save] Document being saved:', {
    id: this._id,
    version: this.__v,
    potSize: this.pot.length,
    playerBets: this.playerBets,
    stage: this.stage,
    caller: callerLine,
  });

  next();
});

PokerGameSchema.post('save', function(doc, next) {
  console.log('[Mongoose Save] Save completed:', {
    id: doc._id,
    newVersion: doc.__v,
    potSize: doc.pot.length,
    playerBets: doc.playerBets,
  });

  next();
});

export const PokerGame =
  models.PokerGame || model<PokerGameDocument>('PokerGame', PokerGameSchema);
