// app/api/users/[username]/avatar/route.ts

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/mongoose";
import User from "@/app/lib/models/user";
import { transformPopulatedImage } from "@/app/lib/utils/transformers";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    await connectToDatabase();

    const user = await User.findOne({ username })
      .populate("avatar")
      .select("avatar")
      .lean();

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      avatar: user.avatar ? transformPopulatedImage(user.avatar) : null
    });
  } catch (err: any) {
    console.error("Error fetching user avatar:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
