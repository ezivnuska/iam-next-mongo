if (typeof window !== 'undefined') throw new Error('Server-only module')

import mongoose, { Schema, Model, Document, Types } from 'mongoose'
import { UserRole } from '@iam/shared-types'
import type { ImageDocument } from './image'

export interface UserDocument extends Document {
  _id: Types.ObjectId
  username: string
  email: string
  role: UserRole
  bio: string
  avatar?: Types.ObjectId | ImageDocument | null
  password: string
  verified: boolean
  verifyToken?: string
  verifyTokenExpires?: Date
  resetPasswordToken?: string
  resetPasswordExpires?: Date
  stripeCustomerId?: string
  stripeDefaultPaymentMethodId?: string
  stripeAccountId?: string
  stripeAccountEnabled?: boolean
  expoPushToken?: string
  createdAt: Date
  updatedAt: Date
  emailVerified?: Date | null
}

const UserSchema = new Schema<UserDocument>(
  {
    username:                       { type: String, required: true, unique: true },
    email:                          { type: String, required: true, unique: true },
    role:                           { type: String, enum: Object.values(UserRole), default: UserRole.User },
    bio:                            { type: String, default: '' },
    avatar:                         { type: Schema.Types.ObjectId, ref: 'Image', default: null },
    password:                       { type: String, required: true },
    verified:                       { type: Boolean, default: false },
    verifyToken:                    String,
    verifyTokenExpires:             Date,
    resetPasswordToken:             String,
    resetPasswordExpires:           Date,
    stripeCustomerId:               { type: String },
    stripeDefaultPaymentMethodId:   { type: String },
    stripeAccountId:                { type: String },
    stripeAccountEnabled:           { type: Boolean, default: false },
    expoPushToken:                  { type: String },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        ret.id = ret._id.toString()
        if (ret.avatar && typeof ret.avatar === 'object' && '_id' in ret.avatar) {
          ret.avatar = {
            _id: ret.avatar._id.toString(),
            variants: ret.avatar.variants,
          }
        }
        delete ret._id
        delete ret.__v
        delete ret.password
        return ret
      },
    },
  }
)

const UserModel: Model<UserDocument> =
  mongoose.models.User || mongoose.model<UserDocument>('User', UserSchema)

export default UserModel
