// app/lib/utils/transformers/content.ts

import { transformPopulatedImage, transformPopulatedAuthor } from '@iam/db'
import type { Entry } from '@/app/lib/definitions/entry'
import type { Image as ImageType } from '@/app/lib/definitions/image'

export function transformLikesArray(likes: Array<{ toString(): string }> | undefined): string[] {
  return likes?.map(id => id.toString()) || []
}

export function isLikedByCurrentUser(
  likes: Array<{ toString(): string }> | undefined,
  userId: string | undefined
): boolean {
  if (!userId) return false
  return (likes || []).some(id => id.toString() === userId)
}

export function transformLinkPreview(linkPreview: { title?: string; description?: string; image?: string } | null | undefined) {
  if (!linkPreview) return undefined
  return {
    ...(linkPreview.title && { title: linkPreview.title }),
    ...(linkPreview.description && { description: linkPreview.description }),
    ...(linkPreview.image && { image: linkPreview.image }),
  }
}

type RawDoc = {
  _id: { toString(): string }
  createdAt: { toISOString(): string }
  updatedAt: { toISOString(): string }
  contentType: 'memory' | 'post'
  author?: unknown
  image?: unknown
  likes?: Array<{ toString(): string }>
  content?: string
  date?: { toISOString(): string }
  title?: string
  shared?: boolean
  linkUrl?: string
  linkPreview?: { title?: string; description?: string; image?: string }
  userId?: { toString(): string }
  username?: string
  alt?: string
  variants?: ImageType['variants']
  [key: string]: unknown
}

export function transformEntry(
  entry: RawDoc,
  commentCounts: Record<string, number>,
  currentUserId?: string
): Entry {
  const entryId = entry._id.toString()
  return {
    id: entryId,
    contentType: entry.contentType,
    createdAt: entry.createdAt.toISOString(),
    updatedAt: entry.updatedAt.toISOString(),
    author: transformPopulatedAuthor(entry.author as Parameters<typeof transformPopulatedAuthor>[0]),
    ...(entry.image ? { image: transformPopulatedImage(entry.image, currentUserId) } : {}),
    likes: transformLikesArray(entry.likes),
    likedByCurrentUser: isLikedByCurrentUser(entry.likes, currentUserId),
    commentCount: commentCounts[entryId] || 0,
    ...(entry.content ? { content: entry.content } : {}),
    ...(entry.contentType === 'memory' && {
      date: entry.date?.toISOString(),
      title: entry.title,
      shared: entry.shared ?? false,
    }),
    ...(entry.contentType === 'post' && {
      ...(entry.linkUrl ? { linkUrl: entry.linkUrl } : {}),
      ...(entry.linkPreview && { linkPreview: transformLinkPreview(entry.linkPreview) }),
    }),
  }
}

// transformImage kept for standalone image content items
export function transformImage(
  image: RawDoc,
  commentCounts: Record<string, number>,
  currentUserId?: string
): ImageType & { contentType: 'image' } {
  const imgId = image._id.toString()
  return {
    id: imgId,
    userId: (image.userId as { toString(): string }).toString(),
    username: image.username ?? '',
    alt: image.alt,
    variants: image.variants ?? [],
    likes: transformLikesArray(image.likes),
    likedByCurrentUser: isLikedByCurrentUser(image.likes, currentUserId),
    commentCount: commentCounts[imgId] || 0,
    createdAt: image.createdAt?.toISOString() || new Date().toISOString(),
    contentType: 'image' as const,
  }
}


export function sortContentByDate<T extends { createdAt?: string }>(content: T[]): T[] {
  return [...content].sort((a, b) =>
    new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
  )
}
