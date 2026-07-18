// app/lib/models/membership.ts

import mongoose, { Schema, Model, Document } from 'mongoose'

export interface MembershipDocument extends Document {
  userId:             mongoose.Types.ObjectId
  tier:               'basic' | 'pro'
  creditsTotal:       number  // cents per period ($5 = 500, $15 = 1500)
  creditsAllocated:   number  // cents currently committed to open issues
  currentPeriodStart: Date
  currentPeriodEnd:   Date
}

const MembershipSchema = new Schema<MembershipDocument>(
  {
    userId:             { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    tier:               { type: String, enum: ['basic', 'pro'], required: true },
    creditsTotal:       { type: Number, required: true },
    creditsAllocated:   { type: Number, default: 0 },
    currentPeriodStart: { type: Date, required: true },
    currentPeriodEnd:   { type: Date, required: true },
  },
  { timestamps: true }
)

const MembershipModel: Model<MembershipDocument> =
  mongoose.models.Membership ||
  mongoose.model<MembershipDocument>('Membership', MembershipSchema)

export default MembershipModel
