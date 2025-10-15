// app/lib/actions/user-content.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import { auth } from "@/app/lib/auth";
import Memory from "@/app/lib/models/memory";
import Post from "@/app/lib/models/post";
import Image from "@/app/lib/models/image";
import User from "@/app/lib/models/user";
import { transformPopulatedImage, transformPopulatedAuthor } from "@/app/lib/utils/transformers";
import type { Memory as MemoryType } from "@/app/lib/definitions/memory";
import type { Post as PostType } from "@/app/lib/definitions/post";
import type { Image as ImageType } from "@/app/lib/definitions/image";

export type ContentItem =
  | (MemoryType & { contentType: 'memory' })
  | (PostType & { contentType: 'post' })
  | (ImageType & { contentType: 'image' });

export async function getUserContent(username?: string): Promise<ContentItem[]> {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  await connectToDatabase();

  // Determine which user's content to fetch
  let targetUserId: string;
  if (username) {
    const user = await User.findOne({ username });
    if (!user) {
      throw new Error("User not found");
    }
    targetUserId = user._id.toString();
  } else {
    targetUserId = session.user.id;
  }

  // Fetch memories
  const memoriesQuery = username
    ? { author: targetUserId, shared: true }
    : { author: targetUserId };

  const memories = await Memory.find(memoriesQuery)
    .populate([
      { path: "author", populate: { path: "avatar" } },
      { path: "image" }
    ])
    .sort({ createdAt: -1 })
    .lean();

  // Fetch posts
  const posts = await Post.find({ author: targetUserId })
    .populate([
      { path: "author", populate: { path: "avatar" } },
      { path: "image" }
    ])
    .sort({ createdAt: -1 })
    .lean();

  // Fetch images
  const images = await Image.find({ userId: targetUserId })
    .sort({ createdAt: -1 })
    .lean();

  // Transform and combine all content
  const transformedMemories: ContentItem[] = memories.map((m: any) => ({
    id: m._id.toString(),
    date: m.date.toISOString(),
    title: m.title,
    content: m.content,
    shared: m.shared,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    author: transformPopulatedAuthor(m.author),
    ...(m.image && { image: transformPopulatedImage(m.image) }),
    contentType: 'memory' as const
  }));

  const transformedPosts: ContentItem[] = posts.map((p: any) => ({
    id: p._id.toString(),
    content: p.content,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    author: transformPopulatedAuthor(p.author),
    ...(p.image && { image: transformPopulatedImage(p.image) }),
    ...(p.linkUrl && { linkUrl: p.linkUrl }),
    ...(p.linkPreview && {
      linkPreview: {
        ...(p.linkPreview.title && { title: p.linkPreview.title }),
        ...(p.linkPreview.description && { description: p.linkPreview.description }),
        ...(p.linkPreview.image && { image: p.linkPreview.image }),
      }
    }),
    contentType: 'post' as const
  }));

  const transformedImages: ContentItem[] = images.map((img: any) => ({
    id: img._id.toString(),
    userId: img.userId.toString(),
    username: img.username,
    alt: img.alt,
    variants: img.variants,
    likes: img.likes?.map((id: any) => id.toString()) || [],
    commentCount: img.commentCount || 0,
    createdAt: img.createdAt?.toISOString() || new Date().toISOString(),
    contentType: 'image' as const
  }));

  // Combine and sort by createdAt
  const allContent = [...transformedMemories, ...transformedPosts, ...transformedImages];
  allContent.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return allContent;
}
