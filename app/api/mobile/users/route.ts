// app/api/mobile/users/route.ts
// GET — list all users except current user, with friendship status

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/mongoose";
import { verifyToken } from "@/app/lib/mobile/verifyToken";
import { serializeResource, serializeFriendshipEntry } from "@/app/lib/mobile/serializers";
import UserModel from "@/app/lib/models/user";
import FriendshipModel from "@/app/lib/models/friendship";

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

    // Build a map: otherUserId -> friendship entry
    const friendshipMap = new Map<string, { id: string; status: string; role: "requester" | "recipient" }>();
    for (const f of friendships as any[]) {
      const requesterId = f.requester.toString();
      const recipientId = f.recipient.toString();
      const otherUserId = requesterId === tokenPayload.id ? recipientId : requesterId;
      const role = requesterId === tokenPayload.id ? "requester" : "recipient";
      friendshipMap.set(otherUserId, { id: f._id.toString(), status: f.status, role });
    }

    const serialized = (users as any[]).map((u) => ({
      id: u._id.toString(),
      username: u.username,
      bio: u.bio ?? "",
      avatar: serializeResource(u.avatar),
      friendship: serializeFriendshipEntry(friendshipMap.get(u._id.toString())),
    }));

    return NextResponse.json({ users: serialized });
  } catch (err) {
    console.error("[mobile/users GET]", err);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
