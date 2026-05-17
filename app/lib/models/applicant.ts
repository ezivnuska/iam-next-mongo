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
    issueId: { type: Schema.Types.ObjectId, ref: 'Issue', required: true },
    status: { type: String, enum: ['pending', 'accepted'], default: 'pending' },
    votes: { type: [voteSchema], default: [] },
    bidAmount: { type: Number },
    acceptedAt: { type: Date },
    completionDeadline: { type: Date },
  },
  { timestamps: true }
)

applicantSchema.index({ userId: 1, issueId: 1 }, { unique: true })
applicantSchema.index({ issueId: 1, status: 1 })

const Applicant: Model<IApplicant> = mongoose.models.Applicant || mongoose.model<IApplicant>('Applicant', applicantSchema)
export default Applicant
