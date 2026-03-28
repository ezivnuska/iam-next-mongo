// app/api/mobile/friendships/route.ts
// POST — send a friend request

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/mongoose";
import { verifyToken } from "@/app/lib/mobile/verifyToken";
import FriendshipModel from "@/app/lib/models/friendship";
import UserModel from "@/app/lib/models/user";
import { emitFriendRequest } from "@/app/lib/socket/emit";

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

    if (!/^[a-f\d]{24}$/i.test(recipientId)) {
      return NextResponse.json({ error: "Invalid recipientId" }, { status: 400 });
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

        await emitFriendRequestSent((existing as any)._id.toString(), tokenPayload.id, recipientId);

        return NextResponse.json({
          friendship: { id: (existing as any)._id.toString(), status: "pending_sent" },
        });
      }
    }

    const friendship = await FriendshipModel.create({
      requester: tokenPayload.id,
      recipient: recipientId,
      status: "pending",
    });

    await emitFriendRequestSent((friendship as any)._id.toString(), tokenPayload.id, recipientId);

    return NextResponse.json({
      friendship: { id: (friendship as any)._id.toString(), status: "pending_sent" },
    }, { status: 201 });
  } catch (err) {
    console.error("[mobile/friendships POST]", err);
    return NextResponse.json({ error: "Failed to send friend request" }, { status: 500 });
  }
}

async function emitFriendRequestSent(friendshipId: string, requesterId: string, recipientId: string) {
  try {
    const [requester, recipient] = await Promise.all([
      UserModel.findById(requesterId).lean(),
      UserModel.findById(recipientId).lean(),
    ]);
    if (!requester || !recipient) return;
    await emitFriendRequest({
      friendshipId,
      requester: { id: requesterId, username: (requester as any).username },
      recipient: { id: recipientId, username: (recipient as any).username },
    });
  } catch (err) {
    console.error("[mobile/friendships] emitFriendRequestSent failed:", err);
  }
}
