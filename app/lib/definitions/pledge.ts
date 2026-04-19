// app/lib/definitions/pledge.ts

import type { Types, Document } from 'mongoose'

export interface IPledge extends Document {
  userId: Types.ObjectId
  needId: Types.ObjectId
  amount: number
  createdAt: Date
}
