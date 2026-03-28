// app/api/mobile/users/[id]/route.ts
// GET — fetch a single user by ID with friendship status for the current user

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/mongoose";
import { verifyToken } from "@/app/lib/mobile/verifyToken";
import { serializeResource, serializeFriendship } from "@/app/lib/mobile/serializers";
import UserModel from "@/app/lib/models/user";
import FriendshipModel from "@/app/lib/models/friendship";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tokenPayload = await verifyToken(req);
  if (!tokenPayload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: userId } = await params;

  try {
    await connectToDatabase();
    await import("@/app/lib/models/image");

    const [userDoc, friendship] = await Promise.all([
      UserModel.findById(userId).populate("avatar", "_id variants").lean(),
      FriendshipModel.findOne({
        $or: [
          { requester: tokenPayload.id, recipient: userId },
          { requester: userId, recipient: tokenPayload.id },
        ],
      }).lean(),
    ]);

    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: (userDoc as any)._id.toString(),
        username: (userDoc as any).username,
        bio: (userDoc as any).bio ?? "",
        avatar: serializeResource((userDoc as any).avatar),
        friendship: serializeFriendship(friendship, tokenPayload.id),
      },
    });
  } catch (err) {
    console.error("[mobile/users/:id GET]", err);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}
