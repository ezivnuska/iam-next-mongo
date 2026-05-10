// app/api/mobile/profile/bio/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/mongoose";
import { withAuth } from "@/app/lib/mobile/withAuth";
import UserModel from "@/app/lib/models/user";
import "@/app/lib/models/image";

export const PATCH = withAuth(async (req, token) => {
  try {
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

    // Strip HTML tags and encoded entities so no markup survives
    const sanitizedBio = trimmedBio
      .replace(/<[^>]*>/g, '')
      .replace(/&(?:[a-z\d]+|#\d+|#x[a-f\d]+);/gi, '');

    await connectToDatabase();

    const userDoc = await UserModel.findByIdAndUpdate(
      token.id,
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
  } catch (err) {
    console.error('[profile/bio PATCH]', err);
    return NextResponse.json({ error: "Failed to update bio" }, { status: 500 });
  }
});
