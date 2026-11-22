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

type RetObj = Record<string, unknown>

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
      transform: (_doc, ret: RetObj) => {
        ret['id'] = (ret['_id'] as { toString(): string }).toString()
        delete ret['_id']
        delete ret['__v']
        for (const field of ['from', 'to'] as const) {
          const val = ret[field]
          if (val && typeof val === 'object' && '_id' in (val as object)) {
            const u = val as RetObj
            const avatarVal = u['avatar']
            ret[field] = {
              id: (u['_id'] as { toString(): string }).toString(),
              username: u['username'],
              avatar: avatarVal && typeof avatarVal === 'object' && '_id' in (avatarVal as object)
                ? {
                    id: ((avatarVal as RetObj)['_id'] as { toString(): string }).toString(),
                    variants: ((avatarVal as RetObj)['variants'] as unknown[] ?? []).map((v) => {
                      const variant = v as RetObj
                      return {
                        size: variant['size'],
                        filename: variant['filename'],
                        width: variant['width'],
                        height: variant['height'],
                        url: variant['url'],
                      }
                    }),
                  }
                : null,
            }
          } else if (val) {
            ret[field] = { id: (val as { toString(): string }).toString() }
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
