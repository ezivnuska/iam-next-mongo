// app/api/mobile/friendships/route.ts
// POST — send a friend request

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { connectToDatabase } from "@/app/lib/mongoose";
import FriendshipModel from "@/app/lib/models/friendship";

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

export async function POST(req: NextRequest) {
  const tokenPayload = await verifyToken(req);
  if (!tokenPayload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { recipientId } = await req.json();

    if (!recipientId || typeof recipientId !== "string") {
      return NextResponse.json({ error: "recipientId is required" }, { status: 400 });
    }

    if (recipientId === tokenPayload.id) {
      return NextResponse.json({ error: "Cannot send friend request to yourself" }, { status: 400 });
    }

    await connectToDatabase();

    // Check for existing friendship in either direction
    const existing = await FriendshipModel.findOne({
      $or: [
        { requester: tokenPayload.id, recipient: recipientId },
        { requester: recipientId, recipient: tokenPayload.id },
      ],
    });

    if (existing) {
      const status = (existing as any).status;
      if (status === "accepted") {
        return NextResponse.json({ error: "Already friends" }, { status: 400 });
      }
      if (status === "pending") {
        return NextResponse.json({ error: "Friend request already pending" }, { status: 400 });
      }
      // Re-send after rejection — update the existing record
      if (status === "rejected") {
        (existing as any).status = "pending";
        (existing as any).requester = tokenPayload.id;
        (existing as any).recipient = recipientId;
        await (existing as any).save();
        return NextResponse.json({
          friendship: {
            id: (existing as any)._id.toString(),
            status: "pending_sent",
          },
        });
      }
    }

    const friendship = await FriendshipModel.create({
      requester: tokenPayload.id,
      recipient: recipientId,
      status: "pending",
    });

    return NextResponse.json({
      friendship: {
        id: (friendship as any)._id.toString(),
        status: "pending_sent",
      },
    }, { status: 201 });
  } catch (err) {
    console.error("[mobile/friendships POST]", err);
    return NextResponse.json({ error: "Failed to send friend request" }, { status: 500 });
  }
}
