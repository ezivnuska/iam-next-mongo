if (typeof window !== 'undefined') throw new Error('Server-only module')

import mongoose, { Schema, Model, Document, Types } from 'mongoose'
import type { UserDocument } from './user'

export interface MessageDocument extends Document {
  _id: Types.ObjectId
  threadId: string
  from: Types.ObjectId | UserDocument
  to: Types.ObjectId | UserDocument
  text: string
  readAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const MessageSchema = new Schema<MessageDocument>(
  {
    threadId: { type: String, required: true, index: true },
    from:     { type: Schema.Types.ObjectId, ref: 'User', required: true },
    to:       { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text:     { type: String, required: true },
    readAt:   { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString()
        delete ret._id
        delete ret.__v
        for (const field of ['from', 'to'] as const) {
          if (ret[field] && typeof ret[field] === 'object' && '_id' in ret[field]) {
            const u = ret[field]
            ret[field] = {
              id: u._id.toString(),
              username: u.username,
              avatar: u.avatar && typeof u.avatar === 'object' && '_id' in u.avatar
                ? {
                    id: u.avatar._id.toString(),
                    variants: (u.avatar.variants ?? []).map((v: any) => ({
                      size: v.size,
                      filename: v.filename,
                      width: v.width,
                      height: v.height,
                      url: v.url,
                    })),
                  }
                : null,
            }
          } else if (ret[field]) {
            ret[field] = { id: ret[field].toString() }
          }
        }
        return ret
      },
    },
  }
)

MessageSchema.index({ threadId: 1, createdAt: -1 })
MessageSchema.index({ from: 1 })
MessageSchema.index({ to: 1 })

const MessageModel: Model<MessageDocument> =
  mongoose.models.Message || mongoose.model<MessageDocument>('Message', MessageSchema)

export default MessageModel
