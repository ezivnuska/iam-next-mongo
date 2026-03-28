// app/api/needs/route.ts

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/mongoose";
import Need from "@/app/lib/models/need";
import "@/app/lib/models/image";
import type { Types } from "mongoose";
import type { ImageVariant } from "@/app/lib/definitions/image";
import { transformPopulatedImage, transformPopulatedAuthor } from "@/app/lib/utils/transformers";
import { logActivity, getRequestMetadata } from "@/app/lib/utils/activity-logger";
import { requireAuth } from "@/app/lib/utils/auth";
import { CONTENT_POPULATE_CONFIG } from "@/app/lib/utils/db-query-config";

interface PopulatedNeedObj {
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

    const { title, content, shared, imageId } = await req.json();

    if (content && content.length > 5000) {
      return NextResponse.json({ error: "Content must be 5000 characters or less" }, { status: 400 });
    }

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Need must have content" }, { status: 400 });
    }

    if (title && title.length > 200) {
      return NextResponse.json({ error: "Title must be 200 characters or less" }, { status: 400 });
    }

    if (imageId && !/^[a-f\d]{24}$/i.test(imageId)) {
      return NextResponse.json({ error: "Invalid image ID" }, { status: 400 });
    }

    await connectToDatabase();

    const newNeed = await Need.create({
      author: userId,
      title: title?.trim() || "Untitled",
      content: content.trim(),
      shared: shared ?? false,
      ...(imageId && { image: imageId }),
    });

    await newNeed.populate(CONTENT_POPULATE_CONFIG);

    const populated = newNeed.toObject() as unknown as PopulatedNeedObj;

    await logActivity({
      userId,
      action: 'create',
      entityType: 'need',
      entityId: populated._id,
      entityData: {
        title: populated.title,
        content: populated.content,
        shared: populated.shared,
        hasImage: !!populated.image,
      },
      metadata: getRequestMetadata(req),
    });

    return NextResponse.json({
      id: populated._id.toString(),
      title: populated.title,
      content: populated.content,
      shared: populated.shared,
      createdAt: populated.createdAt.toISOString(),
      updatedAt: populated.updatedAt.toISOString(),
      author: transformPopulatedAuthor(populated.author),
      ...(populated.image && { image: transformPopulatedImage(populated.image) }),
    });
  } catch (err: any) {
    console.error("Error creating need:", err);
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
