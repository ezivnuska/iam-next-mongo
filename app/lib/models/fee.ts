// app/lib/models/fee.ts

if (typeof window !== 'undefined') throw new Error('Server-only module')

import mongoose, { Schema, Model } from 'mongoose'
import { IFee } from '@/app/lib/definitions/fee'

const feeSchema = new Schema<IFee>(
  {
    userId:                { type: Schema.Types.ObjectId, ref: 'User',  required: true },
    issueId:               { type: Schema.Types.ObjectId, ref: 'Issue', required: true },
    amount:                { type: Number, required: true },
    stripePaymentIntentId: { type: String },
  },
  { timestamps: true }
)

feeSchema.index({ issueId: 1 }, { unique: true })
feeSchema.index({ userId: 1 })

const Fee: Model<IFee> = mongoose.models.Fee || mongoose.model<IFee>('Fee', feeSchema)
export default Fee
