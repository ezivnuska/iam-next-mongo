// app/api/mobile/needs/route.ts
// GET  — list current user's needs
// POST — create a new need

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/mongoose";
import { verifyToken } from "@/app/lib/mobile/verifyToken";
import { serializeIssue } from "@/app/lib/mobile/serializers";
import Issue from "@/app/lib/models/issue";
import Pledge from "@/app/lib/models/pledge";
import Applicant from "@/app/lib/models/applicant";
import Commission from "@/app/lib/models/commission";
import { createPledgeWithPaymentIntent } from "@/app/lib/mobile/createPledge";
import "@/app/lib/models/image";

export async function GET(req: NextRequest) {
  const tokenPayload = await verifyToken(req);
  if (!tokenPayload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const needs = await Issue.find({ author: tokenPayload.id })
      .sort({ createdAt: -1 })
      .populate("image")
      .lean();

    const needIds = (needs as any[]).map((n) => n._id)
    const [pledges, applicants, completions] = await Promise.all([
      Pledge.find({ issueId: { $in: needIds } }).populate({ path: 'userId', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } }).lean(),
      Applicant.find({ issueId: { $in: needIds } }).lean(),
      Commission.find({ issueId: { $in: needIds } }, { issueId: 1, status: 1 }).lean(),
    ])
    const pledgesByNeed: Record<string, any[]> = {}
    for (const p of pledges) {
      const key = p.issueId.toString()
      if (!pledgesByNeed[key]) pledgesByNeed[key] = []
      pledgesByNeed[key].push(p)
    }
    const applicantsByNeed: Record<string, any[]> = {}
    for (const a of applicants) {
      const key = a.issueId.toString()
      if (!applicantsByNeed[key]) applicantsByNeed[key] = []
      applicantsByNeed[key].push(a)
    }
    const completionStatusByNeed: Record<string, string> = {}
    for (const c of completions as any[]) {
      completionStatusByNeed[c.issueId.toString()] = c.status
    }
    const needsWithData = (needs as any[]).map((n) => ({
      ...n,
      pledged: pledgesByNeed[n._id.toString()] ?? [],
      applicants: applicantsByNeed[n._id.toString()] ?? [],
      completionStatus: completionStatusByNeed[n._id.toString()] ?? null,
    }))

    return NextResponse.json({ needs: needsWithData.map(serializeIssue) });
  } catch (err) {
    console.error("[mobile/needs GET]", err);
    return NextResponse.json({ error: "Failed to fetch needs" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const tokenPayload = await verifyToken(req);
  if (!tokenPayload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { issueType, content, imageId, location, locationVisible, initialPledge } = await req.json();

    const validIssueTypes = ['Clean Up', 'Gardening', 'Hauling']
    if (!issueType || !validIssueTypes.includes(issueType)) {
      return NextResponse.json({ error: "Invalid issue type" }, { status: 400 });
    }

    if (content && content.length > 5000) {
      return NextResponse.json({ error: "Content must be 5000 characters or less" }, { status: 400 });
    }

    if (imageId && !/^[a-f\d]{24}$/i.test(imageId)) {
      return NextResponse.json({ error: "Invalid image ID" }, { status: 400 });
    }

    const validLocation =
      location &&
      typeof location.latitude === 'number' &&
      typeof location.longitude === 'number'
        ? { latitude: location.latitude, longitude: location.longitude }
        : undefined;

    await connectToDatabase();

    const need = await Issue.create({
      author: tokenPayload.id,
      issueType,
      ...(content?.trim() ? { content: content.trim() } : {}),
      ...(validLocation ? { location: validLocation } : {}),
      locationVisible: locationVisible === true,
      ...(imageId ? { image: imageId } : {}),
    });

    await need.populate("image");

    let pledged: any[] = [];
    if (initialPledge && typeof initialPledge === 'number' && initialPledge > 0) {
      const pledge = await createPledgeWithPaymentIntent(tokenPayload.id, need._id.toString(), initialPledge);
      await pledge.populate({ path: 'userId', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } });
      pledged = [pledge.toObject()];
    }

    return NextResponse.json({ need: serializeIssue({ ...need.toObject(), pledged, applicants: [] }) }, { status: 201 });
  } catch (err: any) {
    if (err.code === 'NO_PAYMENT_METHOD') {
      return NextResponse.json({ error: err.message, code: 'NO_PAYMENT_METHOD' }, { status: 402 });
    }
    console.error("[mobile/needs POST]", err);
    return NextResponse.json({ error: "Failed to create need" }, { status: 500 });
  }
}
