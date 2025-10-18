// app/lib/actions/user-content.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import { auth } from "@/app/lib/auth";
import Memory from "@/app/lib/models/memory";
import Post from "@/app/lib/models/post";
import Image from "@/app/lib/models/image";
import User from "@/app/lib/models/user";
import {
  transformMemory,
  transformPost,
  transformImage,
  getCommentCountsForContent,
  sortContentByDate
} from "@/app/lib/utils/content-transformers";
import type { ContentItem } from "@/app/lib/definitions/content";

export type { ContentItem };

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

  // Get comment counts for all content types (parallel execution)
  const { memoryCommentCounts, postCommentCounts, imageCommentCounts } =
    await getCommentCountsForContent(memories, posts, images);

  // Transform all content
  const transformedMemories = memories.map((m: any) =>
    transformMemory(m, memoryCommentCounts, session.user?.id)
  );

  const transformedPosts = posts.map((p: any) =>
    transformPost(p, postCommentCounts, session.user?.id)
  );

  const transformedImages = images.map((img: any) =>
    transformImage(img, imageCommentCounts, session.user?.id)
  );

  // Combine and sort by createdAt
  const allContent = sortContentByDate([
    ...transformedMemories,
    ...transformedPosts,
    ...transformedImages
  ]);

  return allContent;
}
