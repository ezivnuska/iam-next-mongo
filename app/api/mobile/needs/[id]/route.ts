// app/api/mobile/needs/[id]/route.ts
// GET    — fetch a single need
// PATCH  — update a need (author only)
// DELETE — remove a need (author only)

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/mongoose";
import { verifyToken } from "@/app/lib/mobile/verifyToken";
import { serializeNeed } from "@/app/lib/mobile/serializers";
import Need from "@/app/lib/models/need";
import "@/app/lib/models/image";
import "@/app/lib/models/user";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tokenPayload = await verifyToken(req);
  if (!tokenPayload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!/^[a-f\d]{24}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid need ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const need = await Need.findById(id)
      .populate({
        path: "author",
        select: "_id username avatar",
        populate: { path: "avatar", select: "_id variants" },
      })
      .populate("image")
      .lean();

    if (!need) {
      return NextResponse.json({ error: "Need not found" }, { status: 404 });
    }

    return NextResponse.json({ need: serializeNeed(need) });
  } catch (err) {
    console.error("[mobile/needs GET by id]", err);
    return NextResponse.json({ error: "Failed to fetch need" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tokenPayload = await verifyToken(req);
  if (!tokenPayload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!/^[a-f\d]{24}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid need ID" }, { status: 400 });
  }

  try {
    const { title, content, minPay, maxPay, imageId, location, locationVisible } = await req.json();

    if (content !== undefined && content.length > 5000) {
      return NextResponse.json({ error: "Content must be 5000 characters or less" }, { status: 400 });
    }

    if (title !== undefined && title.length > 200) {
      return NextResponse.json({ error: "Title must be 200 characters or less" }, { status: 400 });
    }

    if (imageId !== undefined && imageId !== null && !/^[a-f\d]{24}$/i.test(imageId)) {
      return NextResponse.json({ error: "Invalid image ID" }, { status: 400 });
    }

    await connectToDatabase();

    const need = await Need.findById(id);
    if (!need) {
      return NextResponse.json({ error: "Need not found" }, { status: 404 });
    }

    if (need.author.toString() !== tokenPayload.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (title !== undefined) need.title = title.trim() || "Untitled";
    if (content !== undefined) need.content = content.trim();
    if (minPay !== undefined) need.minPay = minPay;
    if (maxPay !== undefined) need.maxPay = maxPay;
    if (imageId !== undefined) need.image = imageId ?? undefined;
    if (location !== undefined) {
      need.location = location !== null &&
        typeof location.latitude === 'number' &&
        typeof location.longitude === 'number'
          ? { latitude: location.latitude, longitude: location.longitude }
          : undefined;
      need.markModified('location');
    }
    if (typeof locationVisible === 'boolean') need.locationVisible = locationVisible;

    await need.save();
    await need.populate([
      { path: "author", select: "_id username avatar", populate: { path: "avatar", select: "_id variants" } },
      { path: "image" },
    ]);

    return NextResponse.json({ need: serializeNeed(need.toObject()) });
  } catch (err) {
    console.error("[mobile/needs PATCH]", err);
    return NextResponse.json({ error: "Failed to update need" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tokenPayload = await verifyToken(req);
  if (!tokenPayload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!/^[a-f\d]{24}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid need ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const need = await Need.findById(id);
    if (!need) {
      return NextResponse.json({ error: "Need not found" }, { status: 404 });
    }

    const isAuthor = need.author.toString() === tokenPayload.id;
    const isAdmin = tokenPayload.role === 'admin';
    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await Need.findByIdAndDelete(id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[mobile/needs DELETE]", err);
    return NextResponse.json({ error: "Failed to delete need" }, { status: 500 });
  }
}
