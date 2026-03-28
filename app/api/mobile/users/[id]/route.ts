// app/api/mobile/users/[id]/route.ts
// GET — fetch a single user by ID with friendship status for the current user

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

    const avatar = (userDoc as any).avatar
      ? {
          id: (userDoc as any).avatar._id.toString(),
          variants: (userDoc as any).avatar.variants ?? [],
        }
      : null;

    let friendshipStatus: string | null = null;
    let friendshipId: string | null = null;

    if (friendship) {
      const f = friendship as any;
      const requesterId = f.requester.toString();
      const role = requesterId === tokenPayload.id ? "requester" : "recipient";
      friendshipId = f._id.toString();
      if (f.status === "accepted") {
        friendshipStatus = "accepted";
      } else if (f.status === "pending") {
        friendshipStatus = role === "requester" ? "pending_sent" : "pending_received";
      } else {
        // rejected — treat as no relationship
        friendshipId = null;
      }
    }

    return NextResponse.json({
      user: {
        id: (userDoc as any)._id.toString(),
        username: (userDoc as any).username,
        bio: (userDoc as any).bio ?? "",
        avatar,
        friendship: friendshipStatus && friendshipId
          ? { id: friendshipId, status: friendshipStatus }
          : null,
      },
    });
  } catch (err) {
    console.error("[mobile/users/:id GET]", err);
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 });
  }
}
