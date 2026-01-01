// app/api/memories/route.ts

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/mongoose";
import Memory from "@/app/lib/models/memory";
import "@/app/lib/models/image"; // Required for populate("image") and populate("author.avatar")
import type { Types } from "mongoose";
import type { ImageVariant } from "@/app/lib/definitions/image";
import { transformPopulatedImage, transformPopulatedAuthor } from "@/app/lib/utils/transformers";
import { logActivity, getRequestMetadata } from "@/app/lib/utils/activity-logger";
import { requireAuth } from "@/app/lib/utils/auth";
import { CONTENT_POPULATE_CONFIG } from "@/app/lib/utils/db-query-config";

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
    const { id: userId } = await requireAuth();

    const { date, title, content, shared, imageId } = await req.json();

    // Validate content length
    if (content && content.length > 5000) {
      return NextResponse.json({ error: "Content must be 5000 characters or less" }, { status: 400 });
    }

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Memory must have content" }, { status: 400 });
    }

    // Validate title length
    if (title && title.length > 200) {
      return NextResponse.json({ error: "Title must be 200 characters or less" }, { status: 400 });
    }

    if (!date) {
      return NextResponse.json({ error: "Memory must have a date" }, { status: 400 });
    }

    // Validate imageId format if provided
    if (imageId && !/^[a-f\d]{24}$/i.test(imageId)) {
      return NextResponse.json({ error: "Invalid image ID" }, { status: 400 });
    }

    await connectToDatabase();

    // Create the memory
    const newMemory = await Memory.create({
      author: userId,
      date: new Date(date),
      title: title?.trim() || "Untitled",
      content: content.trim(),
      shared: shared ?? false,
      ...(imageId && { image: imageId }),
    });

    // Populate author and image for response
    await newMemory.populate(CONTENT_POPULATE_CONFIG);

    const populatedMemory = newMemory.toObject() as unknown as PopulatedMemoryObj;

    // Log activity
    await logActivity({
      userId,
      action: 'create',
      entityType: 'memory',
      entityId: populatedMemory._id,
      entityData: {
        title: populatedMemory.title,
        content: populatedMemory.content,
        shared: populatedMemory.shared,
        hasImage: !!populatedMemory.image
      },
      metadata: getRequestMetadata(req)
    });

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
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
