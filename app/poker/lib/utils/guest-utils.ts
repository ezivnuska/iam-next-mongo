// app/poker/lib/utils/guest-utils.ts
/**
 * Utility functions for guest user management in poker games
 */

import { randomUUID } from 'crypto';

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
 * Generate a unique guest ID
 * Format: guest-{uuid}
 */
export function generateGuestId(): string {
  return `guest-${randomUUID()}`;
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
