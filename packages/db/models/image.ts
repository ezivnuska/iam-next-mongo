if (typeof window !== 'undefined') throw new Error('Server-only module')

import mongoose, { Schema, model, Model, Types, Document } from 'mongoose'
import type { ImageVariant } from '@iam/shared-types'

export interface ImageDocument extends Document {
  _id: Types.ObjectId
  userId: Types.ObjectId
  issueId?: Types.ObjectId
  username: string
  alt?: string
  variants: ImageVariant[]
  likes: Types.ObjectId[]
  createdAt: Date
  updatedAt: Date
}

const VariantSchema = new Schema<ImageVariant>(
  {
    size:     { type: String, required: true },
    filename: { type: String, required: true },
    width:    { type: Number, required: true },
    height:   { type: Number, required: true },
    url:      { type: String, required: true },
  },
  { _id: false }
)

const ImageSchema = new Schema<ImageDocument>(
  {
    userId:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    issueId:  { type: Schema.Types.ObjectId, ref: 'Issue' },
    username: { type: String, required: true },
    alt:      { type: String, default: '' },
    variants: { type: [VariantSchema], default: [] },
    likes:    { type: [Schema.Types.ObjectId], ref: 'User', default: [] },
  },
  { timestamps: true }
)

const ImageModel: Model<ImageDocument> =
  mongoose.models.Image || model<ImageDocument>('Image', ImageSchema)

export default ImageModel
