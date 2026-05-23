// app/lib/models/issue.ts

if (typeof window !== 'undefined') {
  throw new Error('Server-only module')
}

import mongoose, { Schema, Model } from 'mongoose'
import { IIssue } from '@/app/lib/definitions/issue'

const issueReportSchema = new Schema(
  {
    userId:  { type: Schema.Types.ObjectId, ref: 'User', required: true },
    imageId: { type: Schema.Types.ObjectId, ref: 'Image' },
    content: { type: String },
  },
  { _id: true, timestamps: true }
)

const completionReviewSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    vote:   { type: String, enum: ['approve', 'deny'], required: true },
  },
  { _id: false }
)

const completionSchema = new Schema(
  {
    applicantId: { type: Schema.Types.ObjectId, ref: 'Applicant', required: true },
    images:      [{ type: Schema.Types.ObjectId, ref: 'Image' }],
    reviews:     { type: [completionReviewSchema], default: [] },
    status:      { type: String, enum: ['pending', 'approved', 'denied'], default: 'pending' },
    autoApproveAt: { type: Date },
  },
  { _id: true, timestamps: true }
)

const issueSchema = new Schema<IIssue>(
  {
    author:          { type: Schema.Types.ObjectId, ref: 'User', required: true },
    issueType:       { type: String, enum: ['Clean Up', 'Gardening', 'Hauling'], required: true },
    title:           { type: String },
    content:         { type: String },
    status:          { type: String, enum: ['open', 'completed'], default: 'open' },
    minPay:          { type: Number },
    maxPay:          { type: Number },
    location:        { type: { latitude: Number, longitude: Number }, _id: false },
    locationVisible: { type: Boolean, default: false },
    flagged:         { type: Boolean, default: false },
    image:           { type: Schema.Types.ObjectId, ref: 'Image' },
    likes:           [{ type: Schema.Types.ObjectId, ref: 'User', default: [] }],
    completion:      { type: completionSchema, default: null },
    reports:         { type: [issueReportSchema], default: [] },
  },
  { timestamps: true }
)

const Issue: Model<IIssue> = mongoose.models.Issue || mongoose.model<IIssue>('Issue', issueSchema)
export default Issue
