// app/lib/models/applicant.ts

if (typeof window !== 'undefined') {
  throw new Error('Server-only module')
}

import mongoose, { Schema, Model } from 'mongoose'
import { IApplicant } from '@/app/lib/definitions/applicant'

const voteSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    vote: { type: String, enum: ['confirm', 'deny'], required: true },
  },
  { _id: false }
)

const applicantSchema = new Schema<IApplicant>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    needId: { type: Schema.Types.ObjectId, ref: 'Need', required: true },
    status: { type: String, enum: ['pending', 'confirmed', 'accepted'], default: 'pending' },
    votes: { type: [voteSchema], default: [] },
    acceptedAt: { type: Date },
  },
  { timestamps: true }
)

applicantSchema.index({ userId: 1, needId: 1 }, { unique: true })

const Applicant: Model<IApplicant> = mongoose.models.Applicant || mongoose.model<IApplicant>('Applicant', applicantSchema)
export default Applicant
