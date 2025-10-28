// app/api/posts/route.ts

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/app/lib/mongoose";
import Post from "@/app/lib/models/post";
import type { Types } from "mongoose";
import type { ImageVariant } from "@/app/lib/definitions/image";
import { transformPopulatedImage, transformPopulatedAuthor } from "@/app/lib/utils/transformers";
import { logActivity, getRequestMetadata } from "@/app/lib/utils/activity-logger";
import { requireAuth } from "@/app/lib/utils/auth-utils";

interface PopulatedPostObj {
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
  content?: string;
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

    const { content, imageId } = await req.json();

    if ((!content || !content.trim()) && !imageId) {
      return NextResponse.json({ error: "Post must have either content or an image" }, { status: 400 });
    }

    await connectToDatabase();

    // Create the post
    const newPost = await Post.create({
      author: userId,
      content: content?.trim() || "",
      ...(imageId && { image: imageId }),
    });

    // Populate author and image for response
    await newPost.populate([
      {
        path: "author",
        populate: { path: "avatar" }
      },
      { path: "image" }
    ]);

    const populatedPost = newPost.toObject() as unknown as PopulatedPostObj;

    // Log activity
    await logActivity({
      userId,
      action: 'create',
      entityType: 'post',
      entityId: populatedPost._id,
      entityData: {
        content: populatedPost.content,
        hasImage: !!populatedPost.image
      },
      metadata: getRequestMetadata(req)
    });

    return NextResponse.json({
      id: populatedPost._id.toString(),
      content: populatedPost.content,
      createdAt: populatedPost.createdAt.toISOString(),
      updatedAt: populatedPost.updatedAt.toISOString(),
      author: transformPopulatedAuthor(populatedPost.author),
      ...(populatedPost.image && { image: transformPopulatedImage(populatedPost.image) }),
    });
  } catch (err: any) {
    console.error("Error creating post:", err);
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
