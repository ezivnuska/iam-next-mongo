// app/api/auth/mobile/me/route.ts
// Mobile-friendly current-user endpoint that accepts a JWT bearer token

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { connectToDatabase } from "@/app/lib/mongoose";
import UserModel from "@/app/lib/models/user";

const secret = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "change-this-secret"
);

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { payload } = await jwtVerify(token, secret);

    await connectToDatabase();

    await import("@/app/lib/models/image");
    const userDoc = await UserModel.findById(payload.id as string).populate("avatar", "_id variants");
    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const avatar = userDoc.avatar
      ? {
          id: (userDoc.avatar as any)._id.toString(),
          variants: (userDoc.avatar as any).variants ?? [],
        }
      : null;

    let reputation: { average: number; count: number } | null = null;
    try {
      const Rating = (await import('@/app/lib/models/rating')).default;
      const ratings = await Rating.find({ workerId: userDoc._id }).lean() as any[];
      if (ratings.length > 0) {
        reputation = {
          average: Math.round((ratings.reduce((s, r) => s + r.score, 0) / ratings.length) * 10) / 10,
          count: ratings.length,
        };
      }
    } catch {}

    return NextResponse.json({
      id: userDoc._id.toString(),
      username: userDoc.username,
      email: userDoc.email,
      role: userDoc.role,
      bio: userDoc.bio,
      avatar,
      reputation,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }
}
