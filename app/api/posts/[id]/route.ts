// app/api/posts/[id]/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { connectToDatabase } from "@/app/lib/mongoose";
import Post from "@/app/lib/models/post";
import type { Types } from "mongoose";
import type { ImageVariant } from "@/app/lib/definitions/image";
import { transformPopulatedImage, transformPopulatedAuthor } from "@/app/lib/utils/transformers";
import { logActivity, getRequestMetadata } from "@/app/lib/utils/activity-logger";

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
  content: string;
  image?: {
    _id: Types.ObjectId;
    userId: Types.ObjectId;
    username: string;
    alt?: string;
    variants: ImageVariant[];
  };
  linkUrl?: string;
  linkPreview?: {
    title: string;
    description?: string;
    imageUrl?: string;
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
      return NextResponse.json({ error: "Missing post ID" }, { status: 400 });
    }

    const { content, imageId } = await req.json();

    if (!content || !content.trim()) {
      return NextResponse.json({ error: "Post must have content" }, { status: 400 });
    }

    await connectToDatabase();

    const post = await Post.findById(id);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check if the current user is the author
    const isAuthor = post.author.toString() === session.user.id;
    if (!isAuthor) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Update the post
    post.content = content.trim();
    if (imageId !== undefined) {
      post.image = imageId || undefined;
    }

    await post.save();

    // Populate author and image for response
    await post.populate([
      {
        path: "author",
        populate: { path: "avatar" }
      },
      { path: "image" }
    ]);

    const populatedPost = post.toObject() as unknown as PopulatedPostObj;

    // Log activity
    await logActivity({
      userId: session.user.id,
      action: 'update',
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
      ...(populatedPost.linkUrl && { linkUrl: populatedPost.linkUrl }),
      ...(populatedPost.linkPreview && { linkPreview: populatedPost.linkPreview }),
    });
  } catch (err: any) {
    console.error("Error updating post:", err);
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
      return NextResponse.json({ error: "Missing post ID" }, { status: 400 });
    }

    await connectToDatabase();

    const post = await Post.findById(id);
    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 });
    }

    // Check if the current user is the author or an admin
    const isAuthor = post.author.toString() === session.user.id;
    const isAdmin = session.user.role === "admin";

    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Save post data before deletion for activity log
    const postData = {
      content: post.content,
      authorId: post.author.toString()
    };

    await Post.findByIdAndDelete(id);

    // Log activity
    await logActivity({
      userId: session.user.id,
      action: 'delete',
      entityType: 'post',
      entityId: id,
      entityData: postData,
      metadata: getRequestMetadata(req)
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err: any) {
    console.error("Error deleting post:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
