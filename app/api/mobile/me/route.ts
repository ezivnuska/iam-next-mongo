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

    await import("@/app/lib/models/image"); // ensure Image model is registered for populate
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

    return NextResponse.json({
      id: userDoc._id.toString(),
      username: userDoc.username,
      email: userDoc.email,
      role: userDoc.role,
      bio: userDoc.bio,
      avatar,
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }
}
