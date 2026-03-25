// app/api/mobile/images/[id]/like/route.ts
// POST — toggle like on an image

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { connectToDatabase } from "@/app/lib/mongoose";
import ImageModel from "@/app/lib/models/image";

const secret = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "change-this-secret"
);

async function verifyToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  try {
    const { payload } = await jwtVerify(authHeader.slice(7), secret);
    return payload as { id: string };
  } catch {
    return null;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const payload = await verifyToken(req);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: imageId } = await params;

  if (!imageId || !/^[a-f\d]{24}$/i.test(imageId)) {
    return NextResponse.json({ error: "Invalid image ID" }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const image = await ImageModel.findById(imageId).select("likes").lean() as any;
    if (!image) {
      return NextResponse.json({ error: "Image not found" }, { status: 404 });
    }

    const isLiked = (image.likes ?? []).some(
      (id: any) => id.toString() === payload.id
    );

    const updated = await ImageModel.findByIdAndUpdate(
      imageId,
      isLiked
        ? { $pull: { likes: payload.id } }
        : { $addToSet: { likes: payload.id } },
      { new: true, select: "likes" }
    );

    return NextResponse.json({
      liked: !isLiked,
      likeCount: updated?.likes?.length ?? 0,
    });
  } catch (err) {
    console.error("[mobile/images like POST]", err);
    return NextResponse.json({ error: "Failed to toggle like" }, { status: 500 });
  }
}
