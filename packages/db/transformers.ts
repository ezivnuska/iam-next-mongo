import type { Image, ImageVariant, PartialUser } from '@iam/shared-types';

type RawVariant = {
  size: string
  filename: string
  width: number
  height: number
  url: string
}

type RawImageDoc = {
  _id: { toString(): string }
  userId: { toString(): string }
  username: string
  alt?: string
  variants?: RawVariant[]
}

// avatar may be an unpopulated ObjectId or a full populated document
type RawAuthorDoc = {
  _id: { toString(): string }
  username: string
  avatar?: unknown
} | null | undefined

export function transformImageVariant(variant: RawVariant): ImageVariant {
  return {
    size: variant.size,
    filename: variant.filename,
    width: variant.width,
    height: variant.height,
    url: variant.url,
  };
}

export function transformPopulatedImage(image: unknown): Image | undefined {
  if (!image || typeof image !== 'object') return undefined;
  const doc = image as RawImageDoc;
  if (!('username' in doc)) return undefined;
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    username: doc.username,
    alt: doc.alt ?? '',
    variants: (doc.variants || []).map(transformImageVariant),
  };
}

export function transformPopulatedAuthor(author: RawAuthorDoc): PartialUser {
  if (!author) return { id: 'unknown', username: 'Deleted User' };
  const result: PartialUser = {
    id: author._id.toString(),
    username: author.username,
  };
  const av = author.avatar;
  if (av) {
    result.avatar = transformPopulatedImage(av);
  }
  return result;
}
