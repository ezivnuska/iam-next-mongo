import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/mongoose";
import UserModel from "@/app/lib/models/user";
import crypto from "crypto";
import { sendVerificationEmail } from "@/app/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    await connectToDatabase();

    const user = await UserModel.findOne({ email });

    // Return success regardless to avoid leaking which emails are registered
    if (!user || user.verified) {
      return NextResponse.json({ success: true });
    }

    user.verifyToken = crypto.randomBytes(32).toString("hex");
    user.verifyTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();

    await sendVerificationEmail(email, user.verifyToken, user.username);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Resend verification error:", err);
    return NextResponse.json({ error: "Failed to resend verification email" }, { status: 500 });
  }
}
