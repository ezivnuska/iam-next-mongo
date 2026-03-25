// app/api/mobile/profile/bio/route.ts

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { connectToDatabase } from "@/app/lib/mongoose";
import UserModel from "@/app/lib/models/user";
import "@/app/lib/models/image";

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
    ).populate("avatar", "_id variants");

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
      user: {
        id: userDoc._id.toString(),
        username: userDoc.username,
        email: userDoc.email,
        role: userDoc.role,
        bio: userDoc.bio,
        avatar,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Invalid or expired token" },
      { status: 401 }
    );
  }
}
