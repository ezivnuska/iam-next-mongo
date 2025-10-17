// app/api/memories/[id]/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { connectToDatabase } from "@/app/lib/mongoose";
import Memory from "@/app/lib/models/memory";
import type { Types } from "mongoose";
import type { ImageVariant } from "@/app/lib/definitions/image";
import { transformPopulatedImage, transformPopulatedAuthor } from "@/app/lib/utils/transformers";
import { logActivity, getRequestMetadata } from "@/app/lib/utils/activity-logger";

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

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();
    if (!id) {
      return NextResponse.json({ error: "Missing memory ID" }, { status: 400 });
    }

    const { date, title, content, shared, imageId } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Memory must have content" }, { status: 400 });
    }

    if (!date) {
      return NextResponse.json({ error: "Memory must have a date" }, { status: 400 });
    }

    await connectToDatabase();

    const memory = await Memory.findById(id);
    if (!memory) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    // Check if the current user is the author
    const isAuthor = memory.author.toString() === session.user.id;
    if (!isAuthor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update the memory
    memory.date = new Date(date);
    memory.title = title?.trim() || "Untitled";
    memory.content = content.trim();
    memory.shared = shared ?? false;
    if (imageId !== undefined) {
      memory.image = imageId || undefined;
    }

    await memory.save();

    // Populate author and image for response
    await memory.populate([
      {
        path: "author",
        populate: { path: "avatar" }
      },
      { path: "image" }
    ]);

    const populatedMemory = memory.toObject() as unknown as PopulatedMemoryObj;

    // Log activity
    await logActivity({
      userId: session.user.id,
      action: 'update',
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
    console.error("Error updating memory:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();
    if (!id) {
      return NextResponse.json({ error: "Missing memory ID" }, { status: 400 });
    }

    await connectToDatabase();

    const memory = await Memory.findById(id);
    if (!memory) {
      return NextResponse.json({ error: "Memory not found" }, { status: 404 });
    }

    // Check if the current user is the author or an admin
    const isAuthor = memory.author.toString() === session.user.id;
    const isAdmin = session.user.role === "admin";

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Save memory data before deletion for activity log
    const memoryData = {
      title: memory.title,
      content: memory.content,
      shared: memory.shared,
      authorId: memory.author.toString()
    };

    await Memory.findByIdAndDelete(id);

    // Log activity
    await logActivity({
      userId: session.user.id,
      action: 'delete',
      entityType: 'memory',
      entityId: id,
      entityData: memoryData,
      metadata: getRequestMetadata(req)
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("Error deleting memory:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
