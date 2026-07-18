// app/lib/models/allocation.ts

import mongoose, { Schema, Model, Document } from 'mongoose'

export interface AllocationDocument extends Document {
  userId:  mongoose.Types.ObjectId
  issueId: mongoose.Types.ObjectId
  amount:  number  // credits in cents
}

const AllocationSchema = new Schema<AllocationDocument>(
  {
    userId:  { type: Schema.Types.ObjectId, ref: 'User',  required: true },
    issueId: { type: Schema.Types.ObjectId, ref: 'Issue', required: true },
    amount:  { type: Number, required: true, min: 0 },
  },
  { timestamps: true }
)

AllocationSchema.index({ userId: 1, issueId: 1 }, { unique: true })
AllocationSchema.index({ issueId: 1 })
AllocationSchema.index({ userId: 1 })

const AllocationModel: Model<AllocationDocument> =
  mongoose.models.Allocation ||
  mongoose.model<AllocationDocument>('Allocation', AllocationSchema)

export default AllocationModel
