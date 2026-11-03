// app/lib/models/entry.ts

if (typeof window !== 'undefined') {
  throw new Error('Server-only module')
}

import mongoose, { Schema, Model } from 'mongoose'
import { IEntry } from '@/app/lib/definitions/entry'

const entrySchema = new Schema<IEntry>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    contentType: { type: String, enum: ['memory', 'post'], required: true },
    content: { type: String },
    image: { type: Schema.Types.ObjectId, ref: 'Image' },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
    date: { type: Date },
    title: { type: String },
    shared: { type: Boolean, default: false },
    linkUrl: { type: String },
    linkPreview: {
      title: String,
      description: String,
      image: String,
      siteName: String,
    },
  },
  { timestamps: true }
)

entrySchema.pre('validate', function (next) {
  if (this.contentType === 'memory') {
    if (!this.date) this.invalidate('date', 'Memory must have a date')
    if (!this.content?.trim()) this.invalidate('content', 'Memory must have content')
    if (!this.title?.trim()) this.title = 'Untitled'
  } else if (this.contentType === 'post') {
    if (!this.content && !this.image) {
      this.invalidate('content', 'Post must have either content or an image')
    }
  }
  next()
})

const EntryModel: Model<IEntry> =
  mongoose.models.Entry || mongoose.model<IEntry>('Entry', entrySchema)
export default EntryModel
