// app/lib/models/need.ts

// Prevent execution on client side
if (typeof window !== 'undefined') {
  throw new Error('Server-only module');
}

import mongoose, { Schema, Model } from 'mongoose'
import { INeed } from '@/app/lib/definitions/need'

const needSchema = new Schema<INeed>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String },
    content: { type: String, required: true },
    shared: { type: Boolean, default: false },
    image: { type: Schema.Types.ObjectId, ref: 'Image' },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  },
  { timestamps: true }
)

needSchema.pre('save', function (next) {
  this.title = this.title || 'Untitled'
  next()
})

const Need: Model<INeed> = mongoose.models.Need || mongoose.model<INeed>('Need', needSchema)
export default Need
