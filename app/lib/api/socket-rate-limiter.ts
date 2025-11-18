// app/lib/api/socket-rate-limiter.ts

/**
 * Socket-specific rate limiter for real-time events
 *
 * Limits socket events per user to prevent abuse
 * Uses in-memory token bucket algorithm
 */

interface SocketRateLimitConfig {
  /** Maximum number of events allowed in the time window */
  maxEvents: number;
  /** Time window in milliseconds */
  windowMs: number;
}

interface SocketRateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory storage for socket rate limit data
const socketRateLimitStore = new Map<string, SocketRateLimitEntry>();

// Cleanup old entries every 10 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of socketRateLimitStore.entries()) {
    if (entry.resetTime < now) {
      socketRateLimitStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * Check if a socket event should be rate limited
 *
 * @param userId - User ID making the request
 * @param eventType - Type of socket event (e.g., 'poker:bet')
 * @param config - Rate limit configuration
 * @returns Object with isLimited flag and remaining events
 */
export function checkSocketRateLimit(
  userId: string,
  eventType: string,
  config: SocketRateLimitConfig
): { isLimited: boolean; remaining: number; resetTime: number } {
  const now = Date.now();

  // Generate a unique key for this user + event type
  const key = `${userId}:${eventType}`;

  // Get or create rate limit entry
  let entry = socketRateLimitStore.get(key);

  // Reset if window has expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    socketRateLimitStore.set(key, entry);
  }

  // Increment event count
  entry.count++;

  // Check if limit exceeded
  const isLimited = entry.count > config.maxEvents;
  const remaining = Math.max(0, config.maxEvents - entry.count);

  return {
    isLimited,
    remaining,
    resetTime: entry.resetTime,
  };
}

/**
 * Preset rate limit configurations for socket events
 */
export const SOCKET_RATE_LIMITS = {
  /** Strict limit for game actions (30 events per minute) */
  GAME_ACTION: {
    maxEvents: 30,
    windowMs: 60 * 1000,
  },
  /** Medium limit for timer operations (60 events per minute) */
  TIMER: {
    maxEvents: 60,
    windowMs: 60 * 1000,
  },
  /** Very strict limit for destructive operations (5 events per minute) */
  DESTRUCTIVE: {
    maxEvents: 5,
    windowMs: 60 * 1000,
  },
} as const;
