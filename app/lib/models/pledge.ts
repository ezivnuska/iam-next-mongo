// app/lib/models/pledge.ts

if (typeof window !== 'undefined') {
  throw new Error('Server-only module')
}

import mongoose, { Schema, Model } from 'mongoose'
import { IPledge } from '@/app/lib/definitions/pledge'

const pledgeSchema = new Schema<IPledge>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    needId: { type: Schema.Types.ObjectId, ref: 'Need', required: true },
    amount: { type: Number, required: true },
    stripePaymentIntentId: { type: String },
  },
  { timestamps: true }
)

const Pledge: Model<IPledge> = mongoose.models.Pledge || mongoose.model<IPledge>('Pledge', pledgeSchema)
export default Pledge
