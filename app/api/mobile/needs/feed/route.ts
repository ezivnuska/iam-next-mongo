// app/api/mobile/needs/feed/route.ts
// GET — list all needs from all users

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { connectToDatabase } from "@/app/lib/mongoose";
import Need from "@/app/lib/models/need";
import "@/app/lib/models/image";
import "@/app/lib/models/user";

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

function serializeAuthor(author: any) {
  if (!author || typeof author !== "object") return null;
  const avatar =
    author.avatar && typeof author.avatar === "object" && author.avatar._id
      ? { id: author.avatar._id.toString(), variants: author.avatar.variants ?? [] }
      : null;
  return {
    id: author._id.toString(),
    username: author.username,
    avatar,
  };
}

function serializeNeed(n: any) {
  return {
    id: n._id.toString(),
    title: n.title ?? "",
    content: n.content,
    minPay: n.minPay ?? null,
    maxPay: n.maxPay ?? null,
    createdAt: n.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: n.updatedAt?.toISOString() ?? new Date().toISOString(),
    ...(n.image && typeof n.image === "object" && n.image._id
      ? { image: { id: n.image._id.toString(), variants: n.image.variants ?? [] } }
      : {}),
    ...(n.author && typeof n.author === "object" && n.author._id
      ? { author: serializeAuthor(n.author) }
      : {}),
  };
}

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

    return NextResponse.json({ needs: (needs as any[]).map(serializeNeed) });
  } catch (err) {
    console.error("[mobile/needs/feed GET]", err);
    return NextResponse.json({ error: "Failed to fetch needs" }, { status: 500 });
  }
}
