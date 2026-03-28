// app/api/mobile/friendships/[id]/route.ts
// PATCH — accept or reject a pending friend request (recipient only)
// DELETE — remove an accepted friendship or cancel a sent request (either party)

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { connectToDatabase } from "@/app/lib/mongoose";
import FriendshipModel from "@/app/lib/models/friendship";
import UserModel from "@/app/lib/models/user";
import {
  emitFriendRequestAccepted,
  emitFriendRequestRejected,
  emitFriendshipRemoved,
} from "@/app/lib/socket/emit";

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

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tokenPayload = await verifyToken(req);
  if (!tokenPayload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const { action } = await req.json();
    if (action !== "accept" && action !== "reject") {
      return NextResponse.json({ error: "action must be 'accept' or 'reject'" }, { status: 400 });
    }

    await connectToDatabase();

    const friendship = await FriendshipModel.findById(id);
    if (!friendship) {
      return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
    }

    const requesterId = (friendship as any).requester.toString();
    const recipientId = (friendship as any).recipient.toString();

    if (recipientId !== tokenPayload.id) {
      return NextResponse.json({ error: "Only the recipient can accept or reject" }, { status: 403 });
    }

    (friendship as any).status = action === "accept" ? "accepted" : "rejected";
    await (friendship as any).save();

    // Emit to requester: their request was accepted/rejected by the current user (recipient)
    try {
      const recipient = await UserModel.findById(recipientId).lean();
      const username = (recipient as any)?.username ?? "";
      const emitPayload = {
        friendshipId: id,
        userId: requesterId,       // notify the requester
        username,                  // the recipient's username
        otherUserId: recipientId,  // the other user in the friendship
      };
      if (action === "accept") {
        await emitFriendRequestAccepted(emitPayload);
      } else {
        await emitFriendRequestRejected(emitPayload);
      }
    } catch (err) {
      console.error("[mobile/friendships PATCH] socket emit failed:", err);
    }

    return NextResponse.json({
      friendship: {
        id: (friendship as any)._id.toString(),
        status: action === "accept" ? "accepted" : "none",
      },
    });
  } catch (err) {
    console.error("[mobile/friendships PATCH]", err);
    return NextResponse.json({ error: "Failed to update friendship" }, { status: 500 });
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

  try {
    await connectToDatabase();

    const friendship = await FriendshipModel.findById(id);
    if (!friendship) {
      return NextResponse.json({ error: "Friendship not found" }, { status: 404 });
    }

    const requesterId = (friendship as any).requester.toString();
    const recipientId = (friendship as any).recipient.toString();

    if (requesterId !== tokenPayload.id && recipientId !== tokenPayload.id) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    await FriendshipModel.deleteOne({ _id: id });

    // Emit to the other party
    try {
      const otherUserId = requesterId === tokenPayload.id ? recipientId : requesterId;
      const currentUser = await UserModel.findById(tokenPayload.id).lean();
      const username = (currentUser as any)?.username ?? "";
      await emitFriendshipRemoved({
        friendshipId: id,
        userId: otherUserId,       // notify the other user
        username,                  // the current user's username (who removed)
        otherUserId: tokenPayload.id,
      });
    } catch (err) {
      console.error("[mobile/friendships DELETE] socket emit failed:", err);
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[mobile/friendships DELETE]", err);
    return NextResponse.json({ error: "Failed to remove friendship" }, { status: 500 });
  }
}
