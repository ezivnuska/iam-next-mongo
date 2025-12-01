// app/lib/constants/avatar.ts

/**
 * Avatar size mapping for semantic class names
 *
 * These constants define the standardized avatar sizes used throughout the application.
 * Each size has a specific use case to maintain visual consistency.
 */
export const AVATAR_SIZES = {
  'avatar-xs': 24,   // games/badges - compact inline avatars
  'avatar-sm': 32,   // compact lists - leaderboards
  'avatar-base': 36, // navigation - header and user lists
  'avatar-md': 40,   // content cards - posts, comments, activity (default)
  'avatar-lg': 100,  // profile headers - prominent display
} as const;

export type AvatarSizeClass = keyof typeof AVATAR_SIZES;

/**
 * Default avatar size in pixels when no size is specified
 */
export const DEFAULT_AVATAR_SIZE = 40;
