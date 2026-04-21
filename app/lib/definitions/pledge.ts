// app/lib/definitions/pledge.ts

import type { Types, Document } from 'mongoose'
import type { PartialUser } from './user'

export interface IPledge extends Document {
  userId: Types.ObjectId
  needId: Types.ObjectId
  amount: number
  createdAt: Date
  updatedAt: Date
}

export interface Pledge {
  id: string
  needId: string
  amount: number
  createdAt: string
  updatedAt: string
  user: PartialUser
}
