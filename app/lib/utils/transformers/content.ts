// app/lib/utils/content-transformers.ts

import { transformPopulatedImage, transformPopulatedAuthor } from "@/app/lib/utils/transformers";
import { getCommentCounts } from "@/app/lib/actions/comments";
import type { Memory as MemoryType } from "@/app/lib/definitions/memory";
import type { Post as PostType } from "@/app/lib/definitions/post";
import type { Image as ImageType } from "@/app/lib/definitions/image";

/**
 * Transform likes array from ObjectIds to strings
 */
export function transformLikesArray(likes: any[] | undefined): string[] {
  return likes?.map((id: any) => id.toString()) || [];
}

/**
 * Check if content is liked by current user
 */
export function isLikedByCurrentUser(
  likes: any[] | undefined,
  userId: string | undefined
): boolean {
  if (!userId) return false;
  return (likes || []).some((id: any) => id.toString() === userId);
}

/**
 * Transform link preview data
 */
export function transformLinkPreview(linkPreview: any) {
  if (!linkPreview) return undefined;

  return {
    ...(linkPreview.title && { title: linkPreview.title }),
    ...(linkPreview.description && { description: linkPreview.description }),
    ...(linkPreview.image && { image: linkPreview.image }),
  };
}

/**
 * Transform a memory document to client-facing format
 */
export function transformMemory(
  memory: any,
  commentCounts: Record<string, number>,
  currentUserId?: string
): MemoryType & { contentType: 'memory' } {
  const memoryId = memory._id.toString();
  return {
    id: memoryId,
    date: memory.date.toISOString(),
    title: memory.title,
    content: memory.content,
    shared: memory.shared,
    createdAt: memory.createdAt.toISOString(),
    updatedAt: memory.updatedAt.toISOString(),
    author: transformPopulatedAuthor(memory.author),
    ...(memory.image && { image: transformPopulatedImage(memory.image) }),
    likes: transformLikesArray(memory.likes),
    likedByCurrentUser: isLikedByCurrentUser(memory.likes, currentUserId),
    commentCount: commentCounts[memoryId] || 0,
    contentType: 'memory' as const
  };
}

/**
 * Transform a post document to client-facing format
 */
export function transformPost(
  post: any,
  commentCounts: Record<string, number>,
  currentUserId?: string
): PostType & { contentType: 'post' } {
  const postId = post._id.toString();
  return {
    id: postId,
    content: post.content,
    createdAt: post.createdAt.toISOString(),
    updatedAt: post.updatedAt.toISOString(),
    author: transformPopulatedAuthor(post.author),
    ...(post.image && { image: transformPopulatedImage(post.image) }),
    ...(post.linkUrl && { linkUrl: post.linkUrl }),
    ...(post.linkPreview && { linkPreview: transformLinkPreview(post.linkPreview) }),
    likes: transformLikesArray(post.likes),
    likedByCurrentUser: isLikedByCurrentUser(post.likes, currentUserId),
    commentCount: commentCounts[postId] || 0,
    contentType: 'post' as const
  };
}

/**
 * Transform an image document to client-facing format
 */
export function transformImage(
  image: any,
  commentCounts: Record<string, number>,
  currentUserId?: string
): ImageType & { contentType: 'image' } {
  const imgId = image._id.toString();
  return {
    id: imgId,
    userId: image.userId.toString(),
    username: image.username,
    alt: image.alt,
    variants: image.variants,
    likes: transformLikesArray(image.likes),
    likedByCurrentUser: isLikedByCurrentUser(image.likes, currentUserId),
    commentCount: commentCounts[imgId] || 0,
    createdAt: image.createdAt?.toISOString() || new Date().toISOString(),
    contentType: 'image' as const
  };
}

/**
 * Sort content items by createdAt (descending - newest first)
 */
export function sortContentByDate<T extends { createdAt?: string }>(content: T[]): T[] {
  return content.sort((a, b) =>
    new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
  );
}

/**
 * Fetch comment counts for all content types in parallel
 */
export async function getCommentCountsForContent(
  memories: any[],
  posts: any[],
//   images: any[]
): Promise<{
  memoryCommentCounts: Record<string, number>;
  postCommentCounts: Record<string, number>;
//   imageCommentCounts: Record<string, number>;
}> {
//   const imageIds = images.map((img: any) => img._id.toString());
  const postIds = posts.map((p: any) => p._id.toString());
  const memoryIds = memories.map((m: any) => m._id.toString());

  const [
    // imageCommentCounts,
    memoryCommentCounts,
    postCommentCounts,
  ] = await Promise.all([
    // getCommentCounts(imageIds, 'Image'),
    getCommentCounts(postIds, 'Post'),
    getCommentCounts(memoryIds, 'Memory')
  ]);

  return {
    memoryCommentCounts,
    postCommentCounts,
    // imageCommentCounts,
  };
}
