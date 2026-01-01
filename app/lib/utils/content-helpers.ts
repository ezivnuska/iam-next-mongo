// app/lib/utils/content-helpers.ts

import type { ContentItem } from '@/app/lib/definitions/content';
import type { Memory } from '@/app/lib/definitions/memory';
import type { Post } from '@/app/lib/definitions/post';
import type { Image as ImageType } from '@/app/lib/definitions/image';
import type { CommentRefType } from '@/app/lib/definitions/comment';

/**
 * Type guard to check if content item is a Memory
 */
export function isMemory(item: ContentItem): item is Memory & { contentType: 'memory' } {
  return item.contentType === 'memory';
}

/**
 * Type guard to check if content item is a Post
 */
export function isPost(item: ContentItem): item is Post & { contentType: 'post' } {
  return item.contentType === 'post';
}

/**
 * Type guard to check if content item is an Image
 */
export function isImage(item: ContentItem): item is ImageType & { contentType: 'image' } {
  return item.contentType === 'image';
}

/**
 * Check if content item is commentable (Memory or Post)
 * Type guard that narrows to Memory or Post
 */
export function isCommentable(item: ContentItem): item is (Memory & { contentType: 'memory' }) | (Post & { contentType: 'post' }) {
  return isMemory(item) || isPost(item);
}

/**
 * Filter array to only include commentable content (memories and posts)
 * Returns properly typed array of only Memory and Post items
 */
export function filterCommentableContent(items: ContentItem[]) {
  return items.filter(isCommentable);
}

/**
 * Convert content type to CommentRefType (capitalized version)
 */
export function toCommentRefType(contentType: 'memory' | 'post'): CommentRefType {
  return contentType === 'memory' ? 'Memory' : 'Post';
}

/**
 * Get image from content item (works for both Memory and Post)
 */
export function getContentImage(item: ContentItem): ImageType | null | undefined {
  if (isMemory(item) || isPost(item)) {
    return item.image;
  }
  return undefined;
}

/**
 * Get the best available image URL from a content item
 * Prefers 'original' size, falls back to first variant
 */
export function getContentImageUrl(item: ContentItem): string | null {
  const image = getContentImage(item);
  if (!image || !image.variants || image.variants.length === 0) {
    return null;
  }

  const originalVariant = image.variants.find((v) => v.size === 'original');
  return originalVariant?.url || image.variants[0]?.url || null;
}

/**
 * Get image alt text from content item
 */
export function getContentImageAlt(item: ContentItem, fallback = 'Image'): string {
  const image = getContentImage(item);
  return image?.alt || fallback;
}
