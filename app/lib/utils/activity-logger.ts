// app/lib/utils/activity-logger.ts

import Activity from '@/app/lib/models/activity';
import { connectToDatabase } from '@/app/lib/mongoose';
import type { ActivityAction, ActivityEntityType } from '@/app/lib/definitions/activity';
import type { Types } from 'mongoose';

interface LogActivityParams {
  userId: string | Types.ObjectId;
  action: ActivityAction;
  entityType: ActivityEntityType;
  entityId: string | Types.ObjectId;
  entityData?: Record<string, any>;
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    [key: string]: any;
  };
}

/**
 * Logs an activity to the database
 */
export async function logActivity({
  userId,
  action,
  entityType,
  entityId,
  entityData,
  metadata
}: LogActivityParams): Promise<void> {
  try {
    await connectToDatabase();
    await Activity.create({
      user: userId,
      action,
      entityType,
      entityId,
      entityData,
      metadata
    });
    console.log(`Activity logged: ${action} ${entityType} by user ${userId}`);
  } catch (error) {
    // Log error but don't throw to avoid breaking the main operation
    console.error('Failed to log activity:', error);
  }
}

/**
 * Helper to extract request metadata (for use in API routes)
 */
export function getRequestMetadata(request: Request) {
  return {
    ipAddress: request.headers.get('x-forwarded-for') ||
                request.headers.get('x-real-ip') ||
                'unknown',
    userAgent: request.headers.get('user-agent') || 'unknown'
  };
}
