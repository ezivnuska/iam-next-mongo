// app/lib/utils/image-variant.ts

import type { Image } from "@/app/lib/definitions/image";

/**
 * Selects the best image variant based on desired width
 * Falls back to first variant if no width information available
 */
export function getBestVariant(
  image: Image | null | undefined,
  desiredWidth: number
): { url: string; width: number; height: number } | null {
  if (!image?.variants?.length) return null;

  const bestVariant = image.variants.reduce((closest, current) => {
    if (!current.width) return closest;
    return Math.abs(current.width - desiredWidth) < Math.abs((closest.width ?? 0) - desiredWidth)
      ? current
      : closest;
  }, image.variants[0]);

  return bestVariant;
}

/**
 * Gets variant by size name (small, medium, large, original)
 * Useful for backward compatibility with existing code
 */
export function getVariantBySize(
  image: Image | null | undefined,
  sizeName: string
): { url: string; width: number; height: number; size?: string } | null {
  if (!image?.variants?.length) return null;

  const variant = image.variants.find((v) => v.size === sizeName);
  return variant || image.variants[0];
}

/**
 * Common preset sizes for different use cases
 */
export const IMAGE_SIZES = {
  AVATAR_SMALL: 40,
  AVATAR_MEDIUM: 80,
  AVATAR_LARGE: 120,
  THUMBNAIL: 200,
  CARD: 400,
  CONTENT: 800,
  FULL: 1200,
} as const;
