// app/poker/lib/utils/guest-utils.ts
/**
 * Utility functions for guest user management in poker games
 */

const ADJECTIVES = [
  'Swift', 'Lucky', 'Bold', 'Clever', 'Brave',
  'Quick', 'Sharp', 'Bright', 'Wise', 'Cool',
  'Fierce', 'Noble', 'Mighty', 'Silent', 'Wild',
  'Keen', 'Sly', 'Daring', 'Proud', 'Stealth'
];

const NOUNS = [
  'Eagle', 'Tiger', 'Wolf', 'Fox', 'Hawk',
  'Bear', 'Lion', 'Shark', 'Falcon', 'Dragon',
  'Panther', 'Cobra', 'Raven', 'Lynx', 'Viper',
  'Jaguar', 'Puma', 'Orca', 'Phoenix', 'Griffin'
];

/**
 * Generate a UUID v4 compatible with both browser and Node.js
 */
function generateUUID(): string {
  // Browser environment
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  // Node.js environment
  if (typeof require !== 'undefined') {
    const { randomUUID } = require('crypto');
    return randomUUID();
  }

  // Fallback for older browsers (simple UUID v4 implementation)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generate a unique guest ID
 * Format: guest-{uuid}
 * Works in both browser and Node.js environments
 */
export function generateGuestId(): string {
  return `guest-${generateUUID()}`;
}

/**
 * Generate a random guest username
 * Format: {Adjective}{Noun}{Number}
 * Examples: SwiftEagle427, BoldTiger891
 */
export function generateGuestUsername(): string {
  const adjective = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const number = Math.floor(Math.random() * 900) + 100; // 100-999

  return `${adjective}${noun}${number}`;
}

/**
 * Check if a user ID is a guest ID
 */
export function isGuestId(userId: string): boolean {
  return userId.startsWith('guest-');
}

/**
 * Check if a user object is a guest user
 */
export function isGuestUser(user: { id: string; isGuest?: boolean }): boolean {
  return user.isGuest === true || isGuestId(user.id);
}
