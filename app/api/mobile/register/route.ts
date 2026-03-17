// app/api/auth/mobile/register/route.ts
// Mobile-friendly registration endpoint that returns a JWT bearer token

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
    const { email, password, username } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    if (!username) {
      return NextResponse.json(
        { error: "Username is required" },
        { status: 400 }
      );
    }

    if (username.length < 2 || username.length > 20) {
      return NextResponse.json(
        { error: "Username must be between 2 and 20 characters" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const existingEmail = await UserModel.findOne({ email });
    if (existingEmail) {
      return NextResponse.json(
        { error: "Email is already registered" },
        { status: 400 }
      );
    }

    const existingUsername = await UserModel.findOne({ username });
    if (existingUsername) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 400 }
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const newUser = new UserModel({
      email,
      password: hashedPassword,
      username,
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await newUser.save();

    const user = {
      id: newUser._id.toString(),
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
    };

    const token = await new SignJWT(user)
      .setProtectedHeader({ alg: "HS256" })
      .setExpirationTime("7d")
      .sign(secret);

    return NextResponse.json({ token, user }, { status: 201 });
  } catch (err) {
    console.error("Mobile registration error:", err);
    return NextResponse.json({ error: "Failed to register" }, { status: 500 });
  }
}
