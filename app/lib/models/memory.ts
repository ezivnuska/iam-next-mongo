// app/lib/models/memory.ts

// Prevent execution on client side
if (typeof window !== 'undefined') {
  throw new Error('Server-only module');
}

import mongoose, { Schema, Model } from 'mongoose'
import { IMemory } from '@/app/lib/definitions/memory'

const memorySchema = new Schema<IMemory>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    date: { type: Date, required: true },
    title: { type: String },
    content: { type: String, required: true },
    shared: { type: Boolean, default: false },
    image: { type: Schema.Types.ObjectId, ref: 'Image' },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  },
  { timestamps: true }
)

memorySchema.pre('save', function(next) {
  this.title = this.title || 'Untitled'
  next()
})

const Memory: Model<IMemory> = mongoose.models.Memory || mongoose.model<IMemory>('Memory', memorySchema)
export default Memory
