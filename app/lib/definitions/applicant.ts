// app/lib/definitions/applicant.ts

import type { Types, Document } from 'mongoose'

export type ApplicantStatus = 'pending' | 'accepted'

export interface IVote {
  userId: Types.ObjectId
  vote: 'confirm' | 'deny'
}

export interface IApplicant extends Document {
  userId: Types.ObjectId
  issueId: Types.ObjectId
  status: ApplicantStatus
  votes: IVote[]
  bidAmount?: number
  acceptedAt?: Date
  completionDeadline?: Date
  createdAt: Date
}
