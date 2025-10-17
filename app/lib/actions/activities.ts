// app/lib/actions/activities.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import { auth } from "@/app/lib/auth";
import Activity from "@/app/lib/models/activity";
import { transformPopulatedAuthor } from "@/app/lib/utils/transformers";
import type { Activity as ActivityType, ActivityAction, ActivityEntityType } from "@/app/lib/definitions/activity";

interface GetActivitiesParams {
  userId?: string;
  action?: ActivityAction;
  entityType?: ActivityEntityType;
  limit?: number;
  offset?: number;
}

/**
 * Get activities with optional filtering
 */
export async function getActivities({
  userId,
  action,
  entityType,
  limit = 50,
  offset = 0
}: GetActivitiesParams = {}): Promise<ActivityType[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await connectToDatabase();

  // Build query
  const query: any = {};
  if (userId) query.user = userId;
  if (action) query.action = action;
  if (entityType) query.entityType = entityType;

  const activities = await Activity.find(query)
    .populate('user')
    .sort({ createdAt: -1 })
    .skip(offset)
    .limit(limit)
    .lean();

  return activities.map((activity: any) => ({
    id: activity._id.toString(),
    user: transformPopulatedAuthor(activity.user),
    action: activity.action,
    entityType: activity.entityType,
    entityId: activity.entityId.toString(),
    entityData: activity.entityData,
    metadata: activity.metadata,
    createdAt: activity.createdAt.toISOString()
  }));
}

/**
 * Get activities for the current user
 */
export async function getUserActivities(limit = 50, offset = 0): Promise<ActivityType[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return getActivities({
    userId: session.user.id,
    limit,
    offset
  });
}

/**
 * Get activities by entity type
 */
export async function getActivitiesByEntityType(
  entityType: ActivityEntityType,
  limit = 50,
  offset = 0
): Promise<ActivityType[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  return getActivities({
    entityType,
    limit,
    offset
  });
}

/**
 * Get activities for a specific entity
 */
export async function getEntityActivities(
  entityType: ActivityEntityType,
  entityId: string
): Promise<ActivityType[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await connectToDatabase();

  const activities = await Activity.find({
    entityType,
    entityId
  })
    .populate('user')
    .sort({ createdAt: -1 })
    .lean();

  return activities.map((activity: any) => ({
    id: activity._id.toString(),
    user: transformPopulatedAuthor(activity.user),
    action: activity.action,
    entityType: activity.entityType,
    entityId: activity.entityId.toString(),
    entityData: activity.entityData,
    metadata: activity.metadata,
    createdAt: activity.createdAt.toISOString()
  }));
}

/**
 * Get activity stats for a user
 */
export async function getUserActivityStats(userId?: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const targetUserId = userId || session.user.id;

  await connectToDatabase();

  const stats = await Activity.aggregate([
    { $match: { user: targetUserId } },
    {
      $group: {
        _id: {
          action: '$action',
          entityType: '$entityType'
        },
        count: { $sum: 1 }
      }
    },
    {
      $group: {
        _id: '$_id.action',
        entityTypes: {
          $push: {
            type: '$_id.entityType',
            count: '$count'
          }
        },
        total: { $sum: '$count' }
      }
    }
  ]);

  return stats;
}
