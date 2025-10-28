// app/api/activities/unread/route.ts

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/mongoose";
import Activity from "@/app/lib/models/activity";
import { requireAuth } from "@/app/lib/utils/auth-utils";

export async function GET(req: Request) {
  try {
    await requireAuth();

    const { searchParams } = new URL(req.url);
    const since = searchParams.get('since');

    if (!since) {
      return NextResponse.json({ error: "Missing 'since' parameter" }, { status: 400 });
    }

    await connectToDatabase();

    const count = await Activity.countDocuments({
      createdAt: { $gt: new Date(since) }
    });

    return NextResponse.json({ count });
  } catch (err: any) {
    console.error("Error fetching unread activities count:", err);
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
