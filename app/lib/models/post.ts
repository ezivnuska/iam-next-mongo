// app/lib/models/post.ts

// Prevent execution on client side
if (typeof window !== 'undefined') {
  throw new Error('Server-only module');
}

import mongoose, { Schema, Model } from 'mongoose'
import { IPost } from '@/app/lib/definitions/post'

const postSchema = new Schema<IPost>(
  {
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    content: { type: String },
    image: { type: Schema.Types.ObjectId, ref: 'Image' },
    linkUrl: { type: String },
    linkPreview: {
      title: String,
      description: String,
      image: String,
      siteName: String,
    },
    likes: [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
  },
  { timestamps: true }
)

postSchema.pre('validate', function (next) {
  if (!this.content && !this.image) {
    this.invalidate('content', 'Post must have either content or an image.')
  }
  next()
})

const Post: Model<IPost> = mongoose.models.Post || mongoose.model<IPost>('Post', postSchema)
export default Post
