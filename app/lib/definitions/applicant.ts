// app/lib/definitions/applicant.ts

import type { Types, Document } from 'mongoose'

export type ApplicantStatus = 'pending' | 'confirmed' | 'denied'

export interface IVote {
  userId: Types.ObjectId
  vote: 'confirm' | 'deny'
}

export interface IApplicant extends Document {
  userId: Types.ObjectId
  needId: Types.ObjectId
  status: ApplicantStatus
  votes: IVote[]
  createdAt: Date
}
