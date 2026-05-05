// app/lib/models/rating.ts

if (typeof window !== 'undefined') throw new Error('Server-only module')

import mongoose, { Schema, Model } from 'mongoose'

const ratingSchema = new Schema(
  {
    issueId:      { type: Schema.Types.ObjectId, ref: 'Issue',      required: true },
    commissionId: { type: Schema.Types.ObjectId, ref: 'Commission', required: true },
    raterId:      { type: Schema.Types.ObjectId, ref: 'User',       required: true },
    workerId:     { type: Schema.Types.ObjectId, ref: 'User',       required: true },
    score:        { type: Number, required: true, min: 1, max: 5 },
  },
  { timestamps: true }
)

ratingSchema.index({ commissionId: 1, raterId: 1 }, { unique: true })
ratingSchema.index({ workerId: 1 })

const Rating: Model<any> = mongoose.models.Rating || mongoose.model('Rating', ratingSchema)
export default Rating
