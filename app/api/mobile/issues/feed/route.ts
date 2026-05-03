// app/api/mobile/needs/feed/route.ts
// GET — list all needs from all users

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/mongoose";
import { verifyToken } from "@/app/lib/mobile/verifyToken";
import { serializeIssue } from "@/app/lib/mobile/serializers";
import Issue from "@/app/lib/models/issue";
import Pledge from "@/app/lib/models/pledge";
import Applicant from "@/app/lib/models/applicant";
import Commission from "@/app/lib/models/commission";
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
    const query = status === 'open'
      ? { $or: [{ status: 'open' }, { status: { $exists: false } }] }
      : { status }
    const needs = await Issue.find(query)
      .sort({ createdAt: -1 })
      .populate({
        path: "author",
        select: "_id username avatar",
        populate: { path: "avatar", select: "_id variants" },
      })
      .populate("image")
      .lean();

    const needIds = (needs as any[]).map((n) => n._id)
    const [pledges, applicants, completions] = await Promise.all([
      Pledge.find({ issueId: { $in: needIds } }).populate({ path: 'userId', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } }).lean(),
      Applicant.find({ issueId: { $in: needIds } }).lean(),
      Commission.find({ issueId: { $in: needIds } }, { issueId: 1, status: 1 }).lean(),
    ])
    const pledgesByIssue: Record<string, any[]> = {}
    for (const p of pledges) {
      const key = p.issueId.toString()
      if (!pledgesByIssue[key]) pledgesByIssue[key] = []
      pledgesByIssue[key].push(p)
    }
    const applicantsByIssue: Record<string, any[]> = {}
    for (const a of applicants) {
      const key = a.issueId.toString()
      if (!applicantsByIssue[key]) applicantsByIssue[key] = []
      applicantsByIssue[key].push(a)
    }
    const completionStatusByIssue: Record<string, string> = {}
    for (const c of completions as any[]) {
      completionStatusByIssue[c.issueId.toString()] = c.status
    }
    const issuesWithData = (needs as any[]).map((n) => ({
      ...n,
      pledged: pledgesByIssue[n._id.toString()] ?? [],
      applicants: applicantsByIssue[n._id.toString()] ?? [],
      completionStatus: completionStatusByIssue[n._id.toString()] ?? null,
    }))

    return NextResponse.json({ issues: issuesWithData.map(serializeIssue) });
  } catch (err) {
    console.error("[mobile/issues/feed GET]", err);
    return NextResponse.json({ error: "Failed to fetch needs" }, { status: 500 });
  }
}
