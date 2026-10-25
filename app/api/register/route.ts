import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/mongoose";
import UserModel from "@/app/lib/models/user";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendVerificationEmail } from "@/app/lib/email";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const email = formData.get("email")?.toString().trim();
    const password = formData.get("password")?.toString();
    const username = formData.get("username")?.toString().trim();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    // Validate username length
    if (username.length < 2 || username.length > 20) {
      return NextResponse.json({ error: "Username must be between 2 and 20 characters" }, { status: 400 });
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
