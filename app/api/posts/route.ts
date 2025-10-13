// app/api/posts/route.ts

import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { connectToDatabase } from "@/app/lib/mongoose";
import Post from "@/app/lib/models/post";
import UserModel from "@/app/lib/models/user";
import type { ImageVariant } from "@/app/lib/definitions/image";

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
    const populatedPost = await newPost.populate([
      {
        path: "author",
        populate: { path: "avatar" }
      },
      { path: "image" }
    ]);

    const postDoc = populatedPost.toObject();
    const author = postDoc.author as any;
    const image = postDoc.image as any;

    return NextResponse.json({
      id: postDoc._id.toString(),
      content: postDoc.content,
      createdAt: postDoc.createdAt.toISOString(),
      updatedAt: postDoc.updatedAt.toISOString(),
      author: {
        id: author._id.toString(),
        username: author.username,
        ...(author.avatar && typeof author.avatar === 'object' && '_id' in author.avatar && {
          avatar: {
            id: author.avatar._id.toString(),
            userId: author.avatar.userId.toString(),
            username: author.avatar.username,
            alt: author.avatar.alt ?? "",
            variants: (author.avatar.variants || []).map((v: ImageVariant) => ({
              size: v.size,
              filename: v.filename,
              width: v.width,
              height: v.height,
              url: v.url,
            })),
          }
        })
      },
      ...(image && {
        image: {
          id: image._id.toString(),
          userId: image.userId.toString(),
          username: image.username,
          alt: image.alt ?? "",
          variants: (image.variants || []).map((v: ImageVariant) => ({
            size: v.size,
            filename: v.filename,
            width: v.width,
            height: v.height,
            url: v.url,
          })),
        }
      }),
    });
  } catch (err: any) {
    console.error("Error creating post:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
