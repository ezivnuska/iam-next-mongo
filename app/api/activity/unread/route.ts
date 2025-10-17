// app/api/activities/unread/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { connectToDatabase } from "@/app/lib/mongoose";
import Activity from "@/app/lib/models/activity";

export async function GET(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
