// app/lib/models/activity.ts

import mongoose, { Schema, Model } from 'mongoose';
import { IActivity } from '@/app/lib/definitions/activity';

const activitySchema = new Schema<IActivity>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    action: {
      type: String,
      enum: ['create', 'update', 'delete'],
      required: true,
      index: true
    },
    entityType: {
      type: String,
      enum: ['memory', 'post', 'image', 'comment', 'like', 'friendship'],
      required: true,
      index: true
    },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    entityData: { type: Schema.Types.Mixed },
    metadata: {
      ipAddress: String,
      userAgent: String,
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for common queries
activitySchema.index({ user: 1, createdAt: -1 });
activitySchema.index({ entityType: 1, createdAt: -1 });
activitySchema.index({ action: 1, createdAt: -1 });
activitySchema.index({ entityType: 1, entityId: 1 });

const Activity: Model<IActivity> = mongoose.models.Activity || mongoose.model<IActivity>('Activity', activitySchema);
export default Activity;
