// app/lib/utils/avatar-size.ts

import { AVATAR_SIZES, DEFAULT_AVATAR_SIZE, type AvatarSizeClass } from '@/app/lib/constants/avatar';

/**
 * Extracts the largest size from all avatar classes (including responsive ones)
 * Used for selecting the best image variant for optimal quality across all breakpoints
 *
 * @param className - The className string to parse (e.g., 'avatar-base sm:avatar-lg')
 * @returns Largest size in pixels found, or DEFAULT_AVATAR_SIZE (40px) if no avatar classes found
 *
 * @example
 * getLargestAvatarSize('avatar-base sm:avatar-lg') // Returns 100
 * getLargestAvatarSize('avatar-xs') // Returns 24
 * getLargestAvatarSize('rounded-full') // Returns 40 (default)
 * getLargestAvatarSize(undefined) // Returns 40 (default)
 */
export function getLargestAvatarSize(className: string | undefined): number {
  if (!className) return DEFAULT_AVATAR_SIZE;

  const classes = className.split(/\s+/);
  const sizes: number[] = [];

  for (const cls of classes) {
    // Remove responsive prefix if present (e.g., 'sm:avatar-lg' -> 'avatar-lg')
    const baseClass = cls.replace(/^(?:sm|md|lg|xl|2xl|max-sm|max-md|max-lg|max-xl|max-2xl):/, '');

    if (baseClass in AVATAR_SIZES) {
      sizes.push(AVATAR_SIZES[baseClass as AvatarSizeClass]);
    }
  }

  return sizes.length > 0 ? Math.max(...sizes) : DEFAULT_AVATAR_SIZE;
}
