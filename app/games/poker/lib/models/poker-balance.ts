// app/lib/models/poker-balance.ts

import mongoose, { Schema, model, models, Document } from 'mongoose';

export interface PokerBalanceDocument extends Document {
  userId: string;
  chipCount: number;
  updatedAt: Date;
}

const PokerBalanceSchema = new Schema<PokerBalanceDocument>(
  {
    userId: { type: String, required: true, unique: true },
    chipCount: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

export const PokerBalance =
  models.PokerBalance || model<PokerBalanceDocument>('PokerBalance', PokerBalanceSchema);
