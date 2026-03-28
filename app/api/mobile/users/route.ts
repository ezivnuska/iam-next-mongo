// app/api/mobile/users/route.ts
// GET — list all users except current user, with friendship status

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { connectToDatabase } from "@/app/lib/mongoose";
import UserModel from "@/app/lib/models/user";
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

export async function GET(req: NextRequest) {
  const tokenPayload = await verifyToken(req);
  if (!tokenPayload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await connectToDatabase();
    await import("@/app/lib/models/image");

    const [users, friendships] = await Promise.all([
      UserModel.find({ _id: { $ne: tokenPayload.id } })
        .populate("avatar", "_id variants")
        .lean(),
      FriendshipModel.find({
        $or: [
          { requester: tokenPayload.id },
          { recipient: tokenPayload.id },
        ],
      }).lean(),
    ]);

    // Build a map: otherUserId -> friendship info
    const friendshipMap = new Map<string, { id: string; status: string; role: "requester" | "recipient" }>();
    for (const f of friendships as any[]) {
      const requesterId = f.requester.toString();
      const recipientId = f.recipient.toString();
      const otherUserId = requesterId === tokenPayload.id ? recipientId : requesterId;
      const role = requesterId === tokenPayload.id ? "requester" : "recipient";
      friendshipMap.set(otherUserId, {
        id: f._id.toString(),
        status: f.status,
        role,
      });
    }

    const serialized = (users as any[]).map((u) => {
      const avatar = u.avatar
        ? { id: u.avatar._id.toString(), variants: u.avatar.variants ?? [] }
        : null;

      const f = friendshipMap.get(u._id.toString());
      let friendshipStatus: string | null = null;
      let friendshipId: string | null = null;

      if (f) {
        friendshipId = f.id;
        if (f.status === "accepted") {
          friendshipStatus = "accepted";
        } else if (f.status === "pending") {
          friendshipStatus = f.role === "requester" ? "pending_sent" : "pending_received";
        } else if (f.status === "rejected") {
          friendshipStatus = "none";
          friendshipId = null;
        }
      }

      return {
        id: u._id.toString(),
        username: u.username,
        bio: u.bio ?? "",
        avatar,
        friendship: friendshipStatus && friendshipId
          ? { id: friendshipId, status: friendshipStatus }
          : null,
      };
    });

    return NextResponse.json({ users: serialized });
  } catch (err) {
    console.error("[mobile/users GET]", err);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
