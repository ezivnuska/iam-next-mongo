import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/mongoose";
import UserModel from "@/app/lib/models/user";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const user = await UserModel.findOne({
      verifyToken: token,
      verifyTokenExpires: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json({ error: "Invalid or expired verification link" }, { status: 400 });
    }

    user.verified = true;
    user.emailVerified = new Date();
    user.verifyToken = undefined;
    user.verifyTokenExpires = undefined;
    await user.save();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[verify] Database error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
