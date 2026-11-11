// app/lib/utils/transformers/content.ts

import { transformPopulatedImage, transformPopulatedAuthor } from '@iam/db'
import { getCommentCounts } from '@/app/lib/actions/comments'
import type { Entry } from '@/app/lib/definitions/entry'
import type { Image as ImageType } from '@/app/lib/definitions/image'

export function transformLikesArray(likes: any[] | undefined): string[] {
  return likes?.map((id: any) => id.toString()) || []
}

export function isLikedByCurrentUser(
  likes: any[] | undefined,
  userId: string | undefined
): boolean {
  if (!userId) return false
  return (likes || []).some((id: any) => id.toString() === userId)
}

export function transformLinkPreview(linkPreview: any) {
  if (!linkPreview) return undefined
  return {
    ...(linkPreview.title && { title: linkPreview.title }),
    ...(linkPreview.description && { description: linkPreview.description }),
    ...(linkPreview.image && { image: linkPreview.image }),
  }
}

export function transformEntry(
  entry: any,
  commentCounts: Record<string, number>,
  currentUserId?: string
): Entry {
  const entryId = entry._id.toString()
  return {
    id: entryId,
    contentType: entry.contentType,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    author: transformPopulatedAuthor(entry.author),
    ...(entry.image && { image: transformPopulatedImage(entry.image, currentUserId) }),
    likes: transformLikesArray(entry.likes),
    likedByCurrentUser: isLikedByCurrentUser(entry.likes, currentUserId),
    commentCount: commentCounts[entryId] || 0,
    ...(entry.content && { content: entry.content }),
    ...(entry.contentType === 'memory' && {
      date: entry.date?.toISOString(),
      title: entry.title,
      shared: entry.shared ?? false,
    }),
    ...(entry.contentType === 'post' && {
      ...(entry.linkUrl && { linkUrl: entry.linkUrl }),
      ...(entry.linkPreview && { linkPreview: transformLinkPreview(entry.linkPreview) }),
    }),
  }
}

// transformImage kept for standalone image content items
export function transformImage(
  image: any,
  commentCounts: Record<string, number>,
  currentUserId?: string
): ImageType & { contentType: 'image' } {
  const imgId = image._id.toString()
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
    contentType: 'image' as const,
  }
}

export async function getCommentCountsForContent(
  entries: any[]
): Promise<Record<string, number>> {
  const memoryIds = entries.filter(e => e.contentType === 'memory').map((e: any) => e._id.toString())
  const postIds = entries.filter(e => e.contentType === 'post').map((e: any) => e._id.toString())

  const [memoryCounts, postCounts] = await Promise.all([
    memoryIds.length > 0 ? getCommentCounts(memoryIds, 'Memory') : Promise.resolve({} as Record<string, number>),
    postIds.length > 0 ? getCommentCounts(postIds, 'Post') : Promise.resolve({} as Record<string, number>),
  ])

  return { ...memoryCounts, ...postCounts }
}

export function sortContentByDate<T extends { createdAt?: string }>(content: T[]): T[] {
  return [...content].sort((a, b) =>
    new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
  )
}
