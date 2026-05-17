// app/lib/models/pledge.ts

if (typeof window !== 'undefined') {
  throw new Error('Server-only module')
}

import mongoose, { Schema, Model } from 'mongoose'
import { IPledge } from '@/app/lib/definitions/pledge'

const pledgeSchema = new Schema<IPledge>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    issueId: { type: Schema.Types.ObjectId, ref: 'Issue', required: true },
    amount: { type: Number, required: true },
    applicantId: { type: Schema.Types.ObjectId, ref: 'Applicant', default: null },
    rescindIfLost: { type: Boolean, default: false },
    anonymous: { type: Boolean, default: false },
    stripePaymentIntentId: { type: String },
  },
  { timestamps: true }
)

pledgeSchema.index({ issueId: 1 })
pledgeSchema.index({ issueId: 1, applicantId: 1 })

const Pledge: Model<IPledge> = mongoose.models.Pledge || mongoose.model<IPledge>('Pledge', pledgeSchema)
export default Pledge
