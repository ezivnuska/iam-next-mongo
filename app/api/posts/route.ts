// app/api/posts/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { connectToDatabase } from "@/app/lib/mongoose";
import Post from "@/app/lib/models/post";
import UserModel from "@/app/lib/models/user";
import type { Types, Document } from "mongoose";
import { transformPopulatedImage, transformPopulatedAuthor } from "@/app/lib/utils/transformers";

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
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { content, imageId } = await req.json();

    if ((!content || !content.trim()) && !imageId) {
      return NextResponse.json({ error: "Post must have either content or an image" }, { status: 400 });
    }

    await connectToDatabase();

    // Create the post
    const newPost = await Post.create({
      author: session.user.id,
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
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
