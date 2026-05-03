// app/lib/models/commission.ts

if (typeof window !== 'undefined') {
  throw new Error('Server-only module')
}

import mongoose, { Schema, Model } from 'mongoose'
import { ICommission } from '@/app/lib/definitions/commission'

const reviewSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    vote: { type: String, enum: ['approve', 'deny'], required: true },
  },
  { _id: false }
)

const commissionSchema = new Schema<ICommission>(
  {
    issueId: { type: Schema.Types.ObjectId, ref: 'Issue', required: true },
    applicantId: { type: Schema.Types.ObjectId, ref: 'Applicant', required: true },
    images: [{ type: Schema.Types.ObjectId, ref: 'Image' }],
    reviews: { type: [reviewSchema], default: [] },
    status: { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
  },
  { timestamps: true }
)

commissionSchema.index({ issueId: 1 }, { unique: true })

const Commission: Model<ICommission> =
  mongoose.models.Commission || mongoose.model<ICommission>('Commission', commissionSchema)

export default Commission
