// app/lib/definitions/pledge.ts

import type { Types, Document } from 'mongoose'
import type { PartialUser } from './user'

export interface IPledge extends Document {
  userId: Types.ObjectId
  issueId: Types.ObjectId
  amount: number
  applicantId?: Types.ObjectId | null
  rescindIfLost: boolean
  anonymous: boolean
  stripePaymentIntentId?: string
  withdrawn?: boolean
  createdAt: Date
  updatedAt: Date
}

export interface Pledge {
  id: string
  issueId: string
  amount: number
  createdAt: string
  updatedAt: string
  user: PartialUser
}
