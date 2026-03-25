// app/api/mobile/profile/bio/route.ts

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { connectToDatabase } from "@/app/lib/mongoose";
import UserModel from "@/app/lib/models/user";

const secret = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "change-this-secret"
);

export async function PATCH(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.slice(7);
    const { payload } = await jwtVerify(token, secret);

    const { bio } = await req.json();

    if (typeof bio !== "string") {
      return NextResponse.json({ error: "Bio must be a string" }, { status: 400 });
    }

    const trimmedBio = bio.trim();

    if (trimmedBio.length > 500) {
      return NextResponse.json(
        { error: "Bio must be 500 characters or less" },
        { status: 400 }
      );
    }

    const sanitizedBio = trimmedBio.replace(/[<>]/g, "");

    await connectToDatabase();

    const userDoc = await UserModel.findByIdAndUpdate(
      payload.id as string,
      { bio: sanitizedBio },
      { new: true }
    );

    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      user: {
        id: userDoc._id.toString(),
        username: userDoc.username,
        email: userDoc.email,
        role: userDoc.role,
        bio: userDoc.bio,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }
}
