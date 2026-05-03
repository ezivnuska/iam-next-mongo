// app/lib/models/issue.ts

// Prevent execution on client side
if (typeof window !== 'undefined') {
  throw new Error('Server-only module');
}

import mongoose, { Schema, Model } from 'mongoose'
import { IIssue } from '@/app/lib/definitions/issue'

const issueSchema = new Schema<IIssue>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String },
    content: { type: String },
    status: { type: String, enum: ['open', 'completed'], default: 'open' },
    minPay: { type: Number },
    maxPay: { type: Number },
    location: { type: { latitude: Number, longitude: Number }, _id: false },
    locationVisible: { type: Boolean, default: false },
    image: { type: Schema.Types.ObjectId, ref: 'Image' },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  },
  { timestamps: true }
)

issueSchema.pre('save', function (next) {
  this.title = this.title || 'Untitled'
  next()
})

const Issue: Model<IIssue> = mongoose.models.Issue || mongoose.model<IIssue>('Issue', issueSchema)
export default Issue
