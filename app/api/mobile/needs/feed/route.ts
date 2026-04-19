// app/api/mobile/needs/feed/route.ts
// GET — list all needs from all users

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/mongoose";
import { verifyToken } from "@/app/lib/mobile/verifyToken";
import { serializeNeed } from "@/app/lib/mobile/serializers";
import Need from "@/app/lib/models/need";
import Pledge from "@/app/lib/models/pledge";
import "@/app/lib/models/image";
import "@/app/lib/models/user";

export async function GET(req: NextRequest) {
  const tokenPayload = await verifyToken(req);
  if (!tokenPayload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const needs = await Need.find({})
      .sort({ createdAt: -1 })
      .populate({
        path: "author",
        select: "_id username avatar",
        populate: { path: "avatar", select: "_id variants" },
      })
      .populate("image")
      .lean();

    const needIds = (needs as any[]).map((n) => n._id)
    const pledges = await Pledge.find({ needId: { $in: needIds } }).lean()
    const pledgesByNeed: Record<string, any[]> = {}
    for (const p of pledges) {
      const key = p.needId.toString()
      if (!pledgesByNeed[key]) pledgesByNeed[key] = []
      pledgesByNeed[key].push(p)
    }
    const needsWithPledges = (needs as any[]).map((n) => ({ ...n, pledged: pledgesByNeed[n._id.toString()] ?? [] }))

    return NextResponse.json({ needs: needsWithPledges.map(serializeNeed) });
  } catch (err) {
    console.error("[mobile/needs/feed GET]", err);
    return NextResponse.json({ error: "Failed to fetch needs" }, { status: 500 });
  }
}
