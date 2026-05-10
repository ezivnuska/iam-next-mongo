// app/lib/definitions/fee.ts

import type { Types, Document } from 'mongoose'

export interface IFee extends Document {
  userId: Types.ObjectId
  issueId: Types.ObjectId
  amount: number
  stripePaymentIntentId?: string
  createdAt: Date
  updatedAt: Date
}
