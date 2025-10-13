// app/api/memories/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { connectToDatabase } from "@/app/lib/mongoose";
import Memory from "@/app/lib/models/memory";
import type { Types } from "mongoose";
import type { ImageVariant } from "@/app/lib/definitions/image";
import { transformPopulatedImage, transformPopulatedAuthor } from "@/app/lib/utils/transformers";

interface PopulatedMemoryObj {
  _id: Types.ObjectId;
  author: {
    _id: Types.ObjectId;
    username: string;
    avatar?: Types.ObjectId | {
      _id: Types.ObjectId;
      userId: Types.ObjectId;
      username: string;
      alt?: string;
      variants: ImageVariant[];
    };
  };
  date: Date;
  title?: string;
  content: string;
  shared: boolean;
  image?: {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    username: string;
    alt?: string;
    variants: ImageVariant[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { date, title, content, shared, imageId } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Memory must have content" }, { status: 400 });
    }

    if (!date) {
      return NextResponse.json({ error: "Memory must have a date" }, { status: 400 });
    }

    await connectToDatabase();

    // Create the memory
    const newMemory = await Memory.create({
      author: session.user.id,
      date: new Date(date),
      title: title?.trim() || "Untitled",
      content: content.trim(),
      shared: shared ?? false,
      ...(imageId && { image: imageId }),
    });

    // Populate author and image for response
    await newMemory.populate([
      {
        path: "author",
        populate: { path: "avatar" }
      },
      { path: "image" }
    ]);

    const populatedMemory = newMemory.toObject() as unknown as PopulatedMemoryObj;

    return NextResponse.json({
      id: populatedMemory._id.toString(),
      date: populatedMemory.date.toISOString(),
      title: populatedMemory.title,
      content: populatedMemory.content,
      shared: populatedMemory.shared,
      createdAt: populatedMemory.createdAt.toISOString(),
      updatedAt: populatedMemory.updatedAt.toISOString(),
      author: transformPopulatedAuthor(populatedMemory.author),
      ...(populatedMemory.image && { image: transformPopulatedImage(populatedMemory.image) }),
    });
  } catch (err: any) {
    console.error("Error creating memory:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
