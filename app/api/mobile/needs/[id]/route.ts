// app/api/mobile/needs/[id]/route.ts
// GET    — fetch a single need
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

    if (need.author.toString() !== tokenPayload.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await Need.findByIdAndDelete(id);

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[mobile/needs DELETE]", err);
    return NextResponse.json({ error: "Failed to delete need" }, { status: 500 });
  }
}
