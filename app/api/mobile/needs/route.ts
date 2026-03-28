// app/api/mobile/needs/route.ts
// GET  — list current user's needs
// POST — create a new need

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { connectToDatabase } from "@/app/lib/mongoose";
import Need from "@/app/lib/models/need";

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

function serializeNeed(n: any) {
  return {
    id: n._id.toString(),
    title: n.title ?? "",
    content: n.content,
    minPay: n.minPay ?? null,
    maxPay: n.maxPay ?? null,
    createdAt: n.createdAt?.toISOString() ?? new Date().toISOString(),
    updatedAt: n.updatedAt?.toISOString() ?? new Date().toISOString(),
  };
}

export async function GET(req: NextRequest) {
  const tokenPayload = await verifyToken(req);
  if (!tokenPayload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();

    const needs = await Need.find({ author: tokenPayload.id })
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({ needs: (needs as any[]).map(serializeNeed) });
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
    const { title, content, minPay, maxPay } = await req.json();

    if (!content?.trim()) {
      return NextResponse.json({ error: "Need must have content" }, { status: 400 });
    }

    if (content.length > 5000) {
      return NextResponse.json({ error: "Content must be 5000 characters or less" }, { status: 400 });
    }

    if (title && title.length > 200) {
      return NextResponse.json({ error: "Title must be 200 characters or less" }, { status: 400 });
    }

    await connectToDatabase();

    const need = await Need.create({
      author: tokenPayload.id,
      title: title?.trim() || "Untitled",
      content: content.trim(),
      ...(minPay != null && { minPay }),
      ...(maxPay != null && { maxPay }),
    });

    return NextResponse.json({ need: serializeNeed(need) }, { status: 201 });
  } catch (err) {
    console.error("[mobile/needs POST]", err);
    return NextResponse.json({ error: "Failed to create need" }, { status: 500 });
  }
}
