// app/lib/utils/transformers.ts

import type { Image, ImageVariant } from "@/app/lib/definitions/image";
import type { PartialUser } from "@/app/lib/definitions/user";

export function transformImageVariant(variant: any): ImageVariant {
  return {
    size: variant.size,
    filename: variant.filename,
    width: variant.width,
    height: variant.height,
    url: variant.url,
  };
}

export function transformPopulatedImage(image: any): Image | undefined {
  if (!image) return undefined;

  return {
    id: image._id.toString(),
    userId: image.userId.toString(),
    username: image.username,
    alt: image.alt ?? "",
    variants: (image.variants || []).map(transformImageVariant),
  };
}

export function transformPopulatedAuthor(author: any): PartialUser {
  if (!author) {
    return {
      id: "unknown",
      username: "Deleted User",
    };
  }

  return {
    id: author._id.toString(),
    username: author.username,
    ...(author.avatar && typeof author.avatar === 'object' && 'userId' in author.avatar && {
      avatar: transformPopulatedImage(author.avatar)
    })
  };
}
