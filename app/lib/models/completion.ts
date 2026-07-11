// app/lib/models/completion.ts

if (typeof window !== 'undefined') throw new Error('Server-only module')

import mongoose, { Schema, Model } from 'mongoose'

const reviewSchema = new Schema(
  { userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    vote:   { type: String, enum: ['approve', 'deny'], required: true } },
  { _id: false }
)

const completionSchema = new Schema(
  {
    issueId:      { type: Schema.Types.ObjectId, ref: 'Issue', required: true },
    workerUserId: { type: Schema.Types.ObjectId, ref: 'User',  required: true },
    images:       [{ type: Schema.Types.ObjectId, ref: 'Image' }],
    reviews:      { type: [reviewSchema], default: [] },
    status:       { type: String, enum: ['pending', 'approved', 'denied', 'partial', 'worker_decision'], default: 'pending' },
    autoApproveAt: { type: Date },
  },
  { timestamps: true }
)

completionSchema.index({ issueId: 1 })
completionSchema.index({ status: 1, autoApproveAt: 1 })

const Completion: Model<any> = mongoose.models.Completion || mongoose.model('Completion', completionSchema)
export default Completion
