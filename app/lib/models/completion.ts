// app/lib/models/completion.ts

if (typeof window !== 'undefined') {
  throw new Error('Server-only module')
}

import mongoose, { Schema, Model } from 'mongoose'
import { ICompletion } from '@/app/lib/definitions/completion'

const reviewSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    vote: { type: String, enum: ['approve', 'deny'], required: true },
  },
  { _id: false }
)

const completionSchema = new Schema<ICompletion>(
  {
    needId: { type: Schema.Types.ObjectId, ref: 'Need', required: true },
    applicantId: { type: Schema.Types.ObjectId, ref: 'Applicant', required: true },
    images: [{ type: Schema.Types.ObjectId, ref: 'Image' }],
    reviews: { type: [reviewSchema], default: [] },
    status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
  },
  { timestamps: true }
)

completionSchema.index({ needId: 1 }, { unique: true })

const Completion: Model<ICompletion> =
  mongoose.models.Completion || mongoose.model<ICompletion>('Completion', completionSchema)

export default Completion
