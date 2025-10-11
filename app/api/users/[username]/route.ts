// app/api/users/[username]/route.ts

import { NextResponse, NextRequest } from "next/server";
import { connectToDatabase } from "@/app/lib/mongoose";
import UserModel from "@/app/lib/models/user";
import { normalizeUser } from "@/app/lib/utils/normalizeUser";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;
    if (!username) {
      return NextResponse.json({ error: "Username is required" }, { status: 400 });
    }

    await connectToDatabase();

    const userDoc = await UserModel.findOne({ username }).populate("avatar", "_id variants");
    if (!userDoc) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json(normalizeUser(userDoc));
  } catch (err) {
    console.error("Error fetching user by username:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
