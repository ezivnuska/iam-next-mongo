// app/lib/models/poker-balance.ts

import mongoose, { Schema, model, models, Document } from 'mongoose';
import type { Chip } from '@/app/lib/definitions/poker';

export interface PokerBalanceDocument extends Document {
  userId: string;
  chips: Chip[];
  updatedAt: Date;
}

const ChipSchema = new Schema(
  {
    value: { type: Number, required: true },
  },
  { _id: false }
);

const PokerBalanceSchema = new Schema<PokerBalanceDocument>(
  {
    userId: { type: String, required: true, unique: true },
    chips: { type: [ChipSchema], default: [] },
  },
  { timestamps: true }
);

export const PokerBalance =
  models.PokerBalance || model<PokerBalanceDocument>('PokerBalance', PokerBalanceSchema);
