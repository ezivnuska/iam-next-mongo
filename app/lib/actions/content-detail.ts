// app/lib/actions/content-detail.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import Memory from "@/app/lib/models/memory";
import Post from "@/app/lib/models/post";
import Image from "@/app/lib/models/image"; // Also registers Image model for populate
import { transformMemory, transformPost } from "@/app/lib/utils/transformers/content";
import { getCommentCounts } from "@/app/lib/actions/comments";
import type { ContentItem } from "@/app/lib/definitions/content";
import { auth } from "@/app/lib/auth";
import { CONTENT_POPULATE_CONFIG } from "@/app/lib/utils/db-query-config";

export type { ContentItem };

/**
 * Fetch a single post or memory by type and ID
 * @param type - Content type ('post' or 'memory')
 * @param id - MongoDB ObjectId string
 * @returns ContentItem or null if not found/unauthorized
 */
export async function getContentDetail(
  type: 'post' | 'memory',
  id: string
): Promise<ContentItem | null> {
  // Validate type
  if (type !== 'post' && type !== 'memory') {
    return null;
  }

  // Validate ID is a valid MongoDB ObjectId format
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return null;
  }

  // Get current user session (may be null if unauthenticated)
  const session = await auth();
  const currentUserId = session?.user?.id;

  await connectToDatabase();

  if (type === 'memory') {
    // Fetch memory with populated fields
    const memory = await Memory.findById(id)
      .populate(CONTENT_POPULATE_CONFIG)
      .lean();

    if (!memory) {
      return null;
    }

    // Check authorization: only visible if shared OR current user is author
    const isAuthor = currentUserId === memory.author._id.toString();
    if (!memory.shared && !isAuthor) {
      return null;
    }

    // Get comment count for this memory
    const commentCounts = await getCommentCounts([id], 'Memory');

    // Transform and return
    return transformMemory(memory, commentCounts, currentUserId);
  }

  // type === 'post'
  // Fetch post with populated fields
  const post = await Post.findById(id)
    .populate(CONTENT_POPULATE_CONFIG)
    .lean();

  if (!post) {
    return null;
  }

  // Posts are always public - no authorization check needed

  // Get comment count for this post
  const commentCounts = await getCommentCounts([id], 'Post');

  // Transform and return
  return transformPost(post, commentCounts, currentUserId);
}

/**
 * Fetch a single post or memory by ID and validate it belongs to the username
 * @param username - Author's username
 * @param id - MongoDB ObjectId string
 * @returns ContentItem or null if not found/doesn't belong to username/unauthorized
 */
export async function getContentDetailByUsername(
  username: string,
  id: string
): Promise<ContentItem | null> {
  // Validate ID is a valid MongoDB ObjectId format
  if (!/^[a-f\d]{24}$/i.test(id)) {
    return null;
  }

  // Get current user session (may be null if unauthenticated)
  const session = await auth();
  const currentUserId = session?.user?.id;

  await connectToDatabase();

  // Query both Memory and Post in parallel for better performance
  const [memory, post] = await Promise.all([
    Memory.findById(id).populate(CONTENT_POPULATE_CONFIG).lean(),
    Post.findById(id).populate(CONTENT_POPULATE_CONFIG).lean()
  ]);

  // Check if found as Memory
  if (memory) {
    // Validate username matches (author is populated)
    const author = memory.author as any;
    if (author.username !== username) {
      return null;
    }

    // Check authorization: only visible if shared OR current user is author
    const isAuthor = currentUserId === author._id.toString();
    if (!memory.shared && !isAuthor) {
      return null;
    }

    // Get comment count for this memory
    const commentCounts = await getCommentCounts([id], 'Memory');

    // Transform and return
    return transformMemory(memory, commentCounts, currentUserId);
  }

  // Check if found as Post
  if (post) {
    // Validate username matches (author is populated)
    const author = post.author as any;
    if (author.username !== username) {
      return null;
    }

    // Posts are always public - no additional authorization check needed

    // Get comment count for this post
    const commentCounts = await getCommentCounts([id], 'Post');

    // Transform and return
    return transformPost(post, commentCounts, currentUserId);
  }

  // Not found as either Memory or Post
  return null;
}
