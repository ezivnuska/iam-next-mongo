//app/lib/definitions/user.ts

// Wire-format types live in @iam/shared-types — re-export them so existing
// imports of '@/app/lib/definitions/user' continue to work unchanged.
export {
  UserRole,
  type AppUser,
  type User,
  type PartialUser,
  type Author,
  type AuthResponseType,
  type RefreshTokenResponse,
} from '@iam/shared-types'

import type { Document, Types } from 'mongoose'
import type { ImageDocument } from './image'
import type { UserRole } from '@iam/shared-types'

// DB-level document (server only — never sent to clients)
export interface UserDocument extends Document {
  _id: Types.ObjectId;
  username: string;
  email: string;
  role: UserRole;
  bio: string;
  avatar?: Types.ObjectId | ImageDocument | null;
  password: string;
  verified: boolean;
  verifyToken?: string;
  verifyTokenExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  stripeCustomerId?: string;
  stripeDefaultPaymentMethodId?: string;
  stripeAccountId?: string;
  stripeAccountEnabled?: boolean;
  expoPushToken?: string;
  createdAt: Date;
  updatedAt: Date;
  emailVerified?: Date | null;
}
