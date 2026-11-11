import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/mongoose";
import UserModel from "@/app/lib/models/user";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendVerificationEmail } from "@/app/lib/email";
import { checkRegisterRateLimit, getIp } from "@/app/lib/utils/rate-limit";

export async function POST(req: NextRequest) {
  if (!checkRegisterRateLimit(getIp(req))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  try {
    const formData = await req.formData();
    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString();
    const username = formData.get("username")?.toString().trim();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    if (!/^[a-zA-Z0-9_.-]{2,20}$/.test(username)) {
      return NextResponse.json({ error: "Username must be 2–20 characters and contain only letters, numbers, underscores, hyphens, or dots" }, { status: 400 });
    }

    await connectToDatabase();

    // Check if email already exists
    const existingEmail = await UserModel.findOne({ email });
    if (existingEmail) {
      return NextResponse.json({ error: "Email is already registered" }, { status: 400 });
    }

    // Check if username already exists
    const existingUsername = await UserModel.findOne({ username });
    if (existingUsername) {
      return NextResponse.json({ error: "Username is already taken" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const newUser = new UserModel({
      email,
      password: hashedPassword,
      username,
      role: "user",
      verified: false,
      verifyToken,
      verifyTokenExpires,
    });

    await newUser.save();

    try {
      await sendVerificationEmail(email, verifyToken, newUser.username);
    } catch (emailErr) {
      console.error("Verification email failed to send:", emailErr);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Registration error:", err);
    return NextResponse.json({ error: "Failed to register" }, { status: 500 });
  }
}
