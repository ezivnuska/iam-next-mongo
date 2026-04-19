// app/lib/definitions/applicant.ts

import type { Types, Document } from 'mongoose'

export interface IApplicant extends Document {
  userId: Types.ObjectId
  needId: Types.ObjectId
  createdAt: Date
}
