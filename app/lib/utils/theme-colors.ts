// app/lib/utils/theme-colors.ts

/**
 * Theme-aware color utilities
 * Provides consistent color values for dark and light modes
 */

/**
 * Primary text color
 * Used for main content text
 */
export const getTextColor = (isDark: boolean): string =>
  isDark ? '#ffffff' : '#111827';

/**
 * Secondary text color
 * Used for less prominent text
 */
export const getSecondaryTextColor = (isDark: boolean): string =>
  isDark ? '#9ca3af' : '#6b7280';

/**
 * Tertiary text color
 * Used for subtitles and metadata
 */
export const getTertiaryTextColor = (isDark: boolean): string =>
  isDark ? '#d1d5db' : '#4b5563';

/**
 * Muted text color
 * Used for very subtle text elements
 */
export const getMutedTextColor = (isDark: boolean): string =>
  isDark ? '#9ca3af' : '#4b5563';
