// app/api/activities/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/mongoose";
import { getActivities } from "@/app/lib/actions/activities";
import type { ActivityAction, ActivityEntityType } from "@/app/lib/definitions/activity";
import { requireAuth } from "@/app/lib/utils/auth-utils";

/**
 * GET /api/activities
 * Query params:
 *  - userId: string (optional)
 *  - action: 'create' | 'update' | 'delete' (optional)
 *  - entityType: 'memory' | 'post' | 'image' | 'comment' | 'like' | 'friendship' (optional)
 *  - limit: number (optional, default 50)
 *  - offset: number (optional, default 0)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAuth();

    await connectToDatabase();

    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || undefined;
    const action = searchParams.get('action') as ActivityAction | undefined;
    const entityType = searchParams.get('entityType') as ActivityEntityType | undefined;
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    const activities = await getActivities({
      userId,
      action,
      entityType,
      limit,
      offset
    });

    return NextResponse.json(activities);
  } catch (error: any) {
    console.error('Error fetching activities:', error);
    if (error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: error.message || "Failed to fetch activities" },
      { status: 500 }
    );
  }
}
