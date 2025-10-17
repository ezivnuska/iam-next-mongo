// app/lib/definitions/activity.ts

import { PartialUser } from "./user";
import type { Types, Document } from 'mongoose';

export type ActivityAction = 'create' | 'update' | 'delete';
export type ActivityEntityType = 'memory' | 'post' | 'image' | 'comment' | 'like' | 'friendship';

export interface IActivity extends Document {
  user: Types.ObjectId;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: Types.ObjectId;
  entityData?: Record<string, any>; // Optional snapshot of the entity at the time of action
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    [key: string]: any;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface Activity {
  id: string;
  user: PartialUser;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string;
  entityData?: Record<string, any>;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    [key: string]: any;
  };
  createdAt: string;
}
