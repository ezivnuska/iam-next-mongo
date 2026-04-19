// app/api/mobile/needs/route.ts
// GET  — list current user's needs
// POST — create a new need

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/mongoose";
import { verifyToken } from "@/app/lib/mobile/verifyToken";
import { serializeNeed } from "@/app/lib/mobile/serializers";
import Need from "@/app/lib/models/need";
import Pledge from "@/app/lib/models/pledge";
import "@/app/lib/models/image";

export async function GET(req: NextRequest) {
  const tokenPayload = await verifyToken(req);
  if (!tokenPayload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const needs = await Need.find({ author: tokenPayload.id })
      .sort({ createdAt: -1 })
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
    const { title, content, imageId, location, locationVisible } = await req.json();

    if (content && content.length > 5000) {
      return NextResponse.json({ error: "Content must be 5000 characters or less" }, { status: 400 });
    }

    if (title && title.length > 200) {
      return NextResponse.json({ error: "Title must be 200 characters or less" }, { status: 400 });
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

    const need = await Need.create({
      author: tokenPayload.id,
      title: title?.trim() || "Untitled",
      ...(content?.trim() ? { content: content.trim() } : {}),
      ...(validLocation ? { location: validLocation } : {}),
      locationVisible: locationVisible === true,
      ...(imageId ? { image: imageId } : {}),
    });

    await need.populate("image");

    return NextResponse.json({ need: serializeNeed({ ...need.toObject(), pledged: [] }) }, { status: 201 });
  } catch (err) {
    console.error("[mobile/needs POST]", err);
    return NextResponse.json({ error: "Failed to create need" }, { status: 500 });
  }
}
