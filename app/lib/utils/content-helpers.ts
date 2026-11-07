// app/lib/utils/content-helpers.ts

import type { ContentItem } from '@/app/lib/definitions/content'
import type { Entry } from '@/app/lib/definitions/entry'
import type { Image as ImageType } from '@/app/lib/definitions/image'
import type { CommentRefType } from '@/app/lib/definitions/comment'

export function isEntry(item: ContentItem): item is Entry {
  return item.contentType === 'memory' || item.contentType === 'post'
}

export function isMemory(item: ContentItem): item is Entry & { contentType: 'memory' } {
  return item.contentType === 'memory'
}

export function isPost(item: ContentItem): item is Entry & { contentType: 'post' } {
  return item.contentType === 'post'
}

export function isImage(item: ContentItem): item is ImageType & { contentType: 'image' } {
  return item.contentType === 'image'
}

export function isCommentable(item: ContentItem): item is Entry {
  return isEntry(item)
}

export function filterCommentableContent(items: ContentItem[]) {
  return items.filter(isEntry)
}

export function toCommentRefType(contentType: 'memory' | 'post'): CommentRefType {
  return contentType === 'memory' ? 'Memory' : 'Post'
}

export function getContentImage(item: ContentItem): ImageType | null | undefined {
  if (isEntry(item)) return item.image
  return undefined
}

export function getContentImageUrl(item: ContentItem): string | null {
  const image = getContentImage(item)
  if (!image || !image.variants || image.variants.length === 0) return null
  const originalVariant = image.variants.find((v) => v.size === 'original')
  return originalVariant?.url || image.variants[0]?.url || null
}

export function getContentImageAlt(item: ContentItem, fallback = 'Image'): string {
  const image = getContentImage(item)
  return image?.alt || fallback
}
