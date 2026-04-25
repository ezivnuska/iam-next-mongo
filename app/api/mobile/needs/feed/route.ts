// app/api/mobile/needs/feed/route.ts
// GET — list all needs from all users

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/mongoose";
import { verifyToken } from "@/app/lib/mobile/verifyToken";
import { serializeNeed } from "@/app/lib/mobile/serializers";
import Need from "@/app/lib/models/need";
import Pledge from "@/app/lib/models/pledge";
import Applicant from "@/app/lib/models/applicant";
import "@/app/lib/models/image";
import "@/app/lib/models/user";

export async function GET(req: NextRequest) {
  const tokenPayload = await verifyToken(req);
  if (!tokenPayload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const status = req.nextUrl.searchParams.get('status') ?? 'open'
    const needs = await Need.find({ status })
      .sort({ createdAt: -1 })
      .populate({
        path: "author",
        select: "_id username avatar",
        populate: { path: "avatar", select: "_id variants" },
      })
      .populate("image")
      .lean();

    const needIds = (needs as any[]).map((n) => n._id)
    const [pledges, applicants] = await Promise.all([
      Pledge.find({ needId: { $in: needIds } }).populate({ path: 'userId', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } }).lean(),
      Applicant.find({ needId: { $in: needIds } }).lean(),
    ])
    const pledgesByNeed: Record<string, any[]> = {}
    for (const p of pledges) {
      const key = p.needId.toString()
      if (!pledgesByNeed[key]) pledgesByNeed[key] = []
      pledgesByNeed[key].push(p)
    }
    const applicantsByNeed: Record<string, any[]> = {}
    for (const a of applicants) {
      const key = a.needId.toString()
      if (!applicantsByNeed[key]) applicantsByNeed[key] = []
      applicantsByNeed[key].push(a)
    }
    const needsWithData = (needs as any[]).map((n) => ({
      ...n,
      pledged: pledgesByNeed[n._id.toString()] ?? [],
      applicants: applicantsByNeed[n._id.toString()] ?? [],
    }))

    return NextResponse.json({ needs: needsWithData.map(serializeNeed) });
  } catch (err) {
    console.error("[mobile/needs/feed GET]", err);
    return NextResponse.json({ error: "Failed to fetch needs" }, { status: 500 });
  }
}
