// app/api/entries/[id]/route.ts

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/mongoose";
import EntryModel from "@/app/lib/models/entry";
import "@/app/lib/models/image";
import { transformPopulatedImage, transformPopulatedAuthor } from "@iam/db";
import { logActivity, getRequestMetadata } from "@/app/lib/utils/activity-logger";
import { requireAuth } from "@/app/lib/utils/auth";
import { CONTENT_POPULATE_CONFIG } from "@/app/lib/utils/db-query-config";
import { isValidObjectId } from "@iam/shared-types";

export async function PUT(req: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();

    if (!id) return NextResponse.json({ error: "Missing entry ID" }, { status: 400 });
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Invalid entry ID" }, { status: 400 });

    const body = await req.json();
    const { content, imageId, date, title, shared } = body;

    if (imageId && imageId !== null && !isValidObjectId(imageId)) {
      return NextResponse.json({ error: "Invalid image ID" }, { status: 400 });
    }

    await connectToDatabase();

    const entry = await EntryModel.findById(id);
    if (!entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    if (entry.author.toString() !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (entry.contentType === 'memory') {
      if (!content?.trim()) return NextResponse.json({ error: "Memory must have content" }, { status: 400 });
      if (content.length > 5000) return NextResponse.json({ error: "Content must be 5000 characters or less" }, { status: 400 });
      if (title && title.length > 200) return NextResponse.json({ error: "Title must be 200 characters or less" }, { status: 400 });
      if (!date) return NextResponse.json({ error: "Memory must have a date" }, { status: 400 });

      entry.date = new Date(date);
      entry.title = title?.trim() || "Untitled";
      entry.content = content.trim();
      entry.shared = shared ?? false;
    } else {
      if (!content?.trim()) return NextResponse.json({ error: "Post must have content" }, { status: 400 });
      if (content.length > 1000) return NextResponse.json({ error: "Content must be 1000 characters or less" }, { status: 400 });

      entry.content = content.trim();
    }

    if (imageId !== undefined) {
      entry.image = imageId || undefined;
    }

    await entry.save();
    await entry.populate(CONTENT_POPULATE_CONFIG);
    const doc = entry.toObject() as any;

    await logActivity({
      userId: user.id,
      action: 'update',
      entityType: 'entry',
      entityId: doc._id,
      entityData: { contentType: doc.contentType, hasImage: !!doc.image },
      metadata: getRequestMetadata(req),
    });

    return NextResponse.json({
      id: doc._id.toString(),
      contentType: doc.contentType,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      author: transformPopulatedAuthor(doc.author),
      ...(doc.content && { content: doc.content }),
      ...(doc.image && { image: transformPopulatedImage(doc.image, user.id) }),
      likes: (doc.likes || []).map((id: any) => id.toString()),
      ...(doc.contentType === 'memory' && {
        date: doc.date?.toISOString(),
        title: doc.title,
        shared: doc.shared ?? false,
      }),
      ...(doc.contentType === 'post' && doc.linkUrl && { linkUrl: doc.linkUrl }),
    });
  } catch (err: any) {
    console.error("Error updating entry:", err);
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await requireAuth();
    const url = new URL(req.url);
    const id = url.pathname.split("/").pop();

    if (!id) return NextResponse.json({ error: "Missing entry ID" }, { status: 400 });
    if (!isValidObjectId(id)) return NextResponse.json({ error: "Invalid entry ID" }, { status: 400 });

    await connectToDatabase();

    const entry = await EntryModel.findById(id);
    if (!entry) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

    const isAuthor = entry.author.toString() === user.id;
    const isAdmin = user.role === "admin";
    if (!isAuthor && !isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await EntryModel.findByIdAndDelete(id);

    await logActivity({
      userId: user.id,
      action: 'delete',
      entityType: 'entry',
      entityId: id,
      entityData: { contentType: entry.contentType, authorId: entry.author.toString() },
      metadata: getRequestMetadata(req),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("Error deleting entry:", err);
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
