// app/api/mobile/needs/[id]/route.ts
// GET    — fetch a single need
// DELETE — remove a need (author only)

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { connectToDatabase } from "@/app/lib/mongoose";
import Need from "@/app/lib/models/need";
import "@/app/lib/models/image";

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
    ...(n.image && typeof n.image === "object" && n.image._id
      ? { image: { id: n.image._id.toString(), variants: n.image.variants ?? [] } }
      : {}),
  };
}

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

    const need = await Need.findById(id).populate("image").lean();
    if (!need) {
      return NextResponse.json({ error: "Need not found" }, { status: 404 });
    }

    if ((need as any).author.toString() !== tokenPayload.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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
