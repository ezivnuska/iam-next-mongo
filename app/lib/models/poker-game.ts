// app/lib/models/poker-game.ts

import mongoose, { Schema, model, models, Document } from 'mongoose';
import type { Card, Bet, Player } from '@/app/lib/definitions/poker';
import { GameStage } from '@/app/lib/definitions/poker';

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
  playing: boolean;
  currentPlayerIndex: number; // Index of current player in players array
  currentBet: number; // Highest bet in current betting round
  playerBets: number[]; // Each player's total bet in current round
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
      enum: [GameStage.Cards, GameStage.Flop, GameStage.Turn, GameStage.River],
      default: GameStage.Cards,
    },

    playing: { type: Boolean, default: false },
    currentPlayerIndex: { type: Number, default: 0 },
    currentBet: { type: Number, default: 0 },
    playerBets: { type: [Number], default: [] },
  },
  { timestamps: true }
);

export const PokerGame =
  models.PokerGame || model<PokerGameDocument>('PokerGame', PokerGameSchema);
