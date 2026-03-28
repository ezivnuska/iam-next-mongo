// app/api/needs/[id]/route.ts

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
  minPay?: number;
  maxPay?: number;
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

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Missing need ID" }, { status: 400 });
    }

    if (!/^[a-f\d]{24}$/i.test(id)) {
      return NextResponse.json({ error: "Invalid need ID format" }, { status: 400 });
    }

    const { title, content, minPay, maxPay, imageId } = await req.json();

    if (content && content.length > 5000) {
      return NextResponse.json({ error: "Content must be 5000 characters or less" }, { status: 400 });
    }

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Need must have content" }, { status: 400 });
    }

    if (title && title.length > 200) {
      return NextResponse.json({ error: "Title must be 200 characters or less" }, { status: 400 });
    }

    if (imageId && imageId !== null && !/^[a-f\d]{24}$/i.test(imageId)) {
      return NextResponse.json({ error: "Invalid image ID" }, { status: 400 });
    }

    await connectToDatabase();

    const need = await Need.findById(id);
    if (!need) {
      return NextResponse.json({ error: "Need not found" }, { status: 404 });
    }

    if (need.author.toString() !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    need.title = title?.trim() || "Untitled";
    need.content = content.trim();
    need.minPay = minPay ?? undefined;
    need.maxPay = maxPay ?? undefined;
    if (imageId !== undefined) {
      need.image = imageId || undefined;
    }

    await need.save();
    await need.populate(CONTENT_POPULATE_CONFIG);

    const populated = need.toObject() as unknown as PopulatedNeedObj;

    await logActivity({
      userId: user.id,
      action: 'update',
      entityType: 'need',
      entityId: populated._id,
      entityData: {
        title: populated.title,
        content: populated.content,
        minPay: populated.minPay,
        maxPay: populated.maxPay,
        hasImage: !!populated.image,
      },
      metadata: getRequestMetadata(req),
    });

    return NextResponse.json({
      id: populated._id.toString(),
      title: populated.title,
      content: populated.content,
      minPay: populated.minPay,
      maxPay: populated.maxPay,
      createdAt: populated.createdAt.toISOString(),
      updatedAt: populated.updatedAt.toISOString(),
      author: transformPopulatedAuthor(populated.author),
      ...(populated.image && { image: transformPopulatedImage(populated.image) }),
    });
  } catch (err: any) {
    console.error("Error updating need:", err);
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: "Missing need ID" }, { status: 400 });
    }

    if (!/^[a-f\d]{24}$/i.test(id)) {
      return NextResponse.json({ error: "Invalid need ID format" }, { status: 400 });
    }

    await connectToDatabase();

    const need = await Need.findById(id);
    if (!need) {
      return NextResponse.json({ error: "Need not found" }, { status: 404 });
    }

    const isAuthor = need.author.toString() === user.id;
    const isAdmin = user.role === "admin";

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const needData = {
      title: need.title,
      content: need.content,
      minPay: need.minPay,
      maxPay: need.maxPay,
      authorId: need.author.toString(),
    };

    await Need.findByIdAndDelete(id);

    await logActivity({
      userId: user.id,
      action: 'delete',
      entityType: 'need',
      entityId: id,
      entityData: needData,
      metadata: getRequestMetadata(req),
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("Error deleting need:", err);
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
