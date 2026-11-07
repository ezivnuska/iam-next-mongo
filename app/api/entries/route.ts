// app/api/entries/route.ts

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/mongoose";
import EntryModel from "@/app/lib/models/entry";
import "@/app/lib/models/image";
import { transformPopulatedImage, transformPopulatedAuthor } from "@iam/db";
import { logActivity, getRequestMetadata } from "@/app/lib/utils/activity-logger";
import { requireAuth } from "@/app/lib/utils/auth";
import { CONTENT_POPULATE_CONFIG } from "@/app/lib/utils/db-query-config";
import { isValidObjectId } from "@iam/shared-types";

export async function POST(req: Request) {
  try {
    const { id: userId } = await requireAuth();
    const body = await req.json();
    const { contentType, content, imageId, date, title, shared, linkUrl } = body;

    if (contentType !== 'memory' && contentType !== 'post') {
      return NextResponse.json({ error: "Invalid contentType" }, { status: 400 });
    }

    if (imageId && !isValidObjectId(imageId)) {
      return NextResponse.json({ error: "Invalid image ID" }, { status: 400 });
    }

    if (contentType === 'memory') {
      if (!content?.trim()) {
        return NextResponse.json({ error: "Memory must have content" }, { status: 400 });
      }
      if (content.length > 5000) {
        return NextResponse.json({ error: "Content must be 5000 characters or less" }, { status: 400 });
      }
      if (title && title.length > 200) {
        return NextResponse.json({ error: "Title must be 200 characters or less" }, { status: 400 });
      }
      if (!date) {
        return NextResponse.json({ error: "Memory must have a date" }, { status: 400 });
      }
    } else {
      if (!content?.trim() && !imageId) {
        return NextResponse.json({ error: "Post must have either content or an image" }, { status: 400 });
      }
      if (content && content.length > 1000) {
        return NextResponse.json({ error: "Content must be 1000 characters or less" }, { status: 400 });
      }
    }

    await connectToDatabase();

    const newEntry = await EntryModel.create({
      author: userId,
      contentType,
      ...(content?.trim() && { content: content.trim() }),
      ...(imageId && { image: imageId }),
      ...(contentType === 'memory' && {
        date: new Date(date),
        title: title?.trim() || "Untitled",
        shared: shared ?? false,
      }),
      ...(contentType === 'post' && linkUrl && { linkUrl }),
    });

    await newEntry.populate(CONTENT_POPULATE_CONFIG);
    const doc = newEntry.toObject() as any;

    await logActivity({
      userId,
      action: 'create',
      entityType: contentType,
      entityId: doc._id,
      entityData: { contentType, hasImage: !!doc.image },
      metadata: getRequestMetadata(req),
    });

    return NextResponse.json({
      id: doc._id.toString(),
      contentType: doc.contentType,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      author: transformPopulatedAuthor(doc.author),
      ...(doc.content && { content: doc.content }),
      ...(doc.image && { image: transformPopulatedImage(doc.image, userId) }),
      likes: [],
      likedByCurrentUser: false,
      ...(contentType === 'memory' && {
        date: doc.date?.toISOString(),
        title: doc.title,
        shared: doc.shared ?? false,
      }),
      ...(contentType === 'post' && doc.linkUrl && { linkUrl: doc.linkUrl }),
    });
  } catch (err: any) {
    console.error("Error creating entry:", err);
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
