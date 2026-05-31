// app/api/auth/mobile/login/route.ts
// Mobile-friendly auth endpoint that returns a JWT bearer token

import { NextRequest, NextResponse } from "next/server";
import { SignJWT } from "jose";
import { connectToDatabase } from "@/app/lib/mongoose";
import UserModel from "@/app/lib/models/user";
import bcrypt from "bcrypt";

const secret = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || "change-this-secret"
);

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    await import("@/app/lib/models/image");
    const userDoc = await UserModel.findOne({ email }).populate("avatar", "_id variants");
    if (!userDoc) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const isValid = await bcrypt.compare(password, userDoc.password);
    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    const avatar = userDoc.avatar
      ? {
          id: (userDoc.avatar as any)._id.toString(),
          variants: (userDoc.avatar as any).variants ?? [],
        }
      : null;

    const user = {
      id: userDoc._id.toString(),
      username: userDoc.username,
      email: userDoc.email,
      role: userDoc.role,
      bio: userDoc.bio ?? undefined,
      avatar,
      reputation: null,
    };

    const token = await new SignJWT(user)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(secret);

    return NextResponse.json({ token, user });
  } catch (err) {
    console.error("Mobile login error:", err);
    return NextResponse.json({ error: "Failed to login" }, { status: 500 });
  }
}
