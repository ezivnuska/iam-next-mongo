// app/lib/definitions/commission.ts

import type { Types, Document } from 'mongoose'

export type CommissionStatus = 'pending' | 'approved' | 'denied'

export interface ICommissionReview {
  userId: Types.ObjectId
  vote: 'approve' | 'deny'
}

export interface ICommission extends Document {
  issueId: Types.ObjectId
  applicantId: Types.ObjectId
  images: Types.ObjectId[]
  reviews: ICommissionReview[]
  status: CommissionStatus
  createdAt: Date
}
