// app/lib/definitions/completion.ts

import type { Types, Document } from 'mongoose'

export type CompletionStatus = 'pending' | 'approved' | 'denied'

export interface ICompletionReview {
  userId: Types.ObjectId
  vote: 'approve' | 'deny'
}

export interface ICompletion extends Document {
  needId: Types.ObjectId
  applicantId: Types.ObjectId
  images: Types.ObjectId[]
  reviews: ICompletionReview[]
  status: CompletionStatus
  createdAt: Date
}
