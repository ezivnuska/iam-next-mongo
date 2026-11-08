// app/lib/actions/activities.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import Activity from "@/app/lib/models/activity";
import "@/app/lib/models/user"; // Required for populate("user")
import "@/app/lib/models/image"; // Required for populate("user.avatar")
import { transformPopulatedAuthor } from "@iam/db";
import type { Activity as ActivityType, ActivityAction, ActivityEntityType } from "@/app/lib/definitions/activity";
import { requireAuth } from "@/app/lib/utils/auth";

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
  const caller = await requireAuth();

  if (userId && userId !== caller.id && caller.role !== 'admin') {
    throw new Error('Forbidden');
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
  const user = await requireAuth();

  return getActivities({
    userId: user.id,
    limit,
    offset
  });
}

