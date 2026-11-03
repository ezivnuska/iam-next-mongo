// Pure token-bucket rate limiting — no framework dependencies.
// withRateLimit (which needs auth context) lives per-app.

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
  keyGenerator?: (request: Request, userId?: string) => string;
}

export interface SocketRateLimitConfig {
  maxEvents: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();
const socketRateLimitStore = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) rateLimitStore.delete(key);
  }
  for (const [key, entry] of socketRateLimitStore.entries()) {
    if (entry.resetTime < now) socketRateLimitStore.delete(key);
  }
}, 10 * 60 * 1000);

function getDefaultKey(request: Request, userId?: string): string {
  if (userId) return `user:${userId}`;
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';
  return `ip:${ip}`;
}

export function checkRateLimit(
  request: Request,
  config: RateLimitConfig,
  userId?: string
): { isLimited: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = config.keyGenerator
    ? config.keyGenerator(request, userId)
    : getDefaultKey(request, userId);

  let entry = rateLimitStore.get(key);
  if (!entry || entry.resetTime < now) {
    entry = { count: 0, resetTime: now + config.windowMs };
    rateLimitStore.set(key, entry);
  }
  entry.count++;
  return {
    isLimited: entry.count > config.maxRequests,
    remaining: Math.max(0, config.maxRequests - entry.count),
    resetTime: entry.resetTime,
  };
}

export function checkSocketRateLimit(
  userId: string,
  eventType: string,
  config: SocketRateLimitConfig
): { isLimited: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = `${userId}:${eventType}`;

  let entry = socketRateLimitStore.get(key);
  if (!entry || entry.resetTime < now) {
    entry = { count: 0, resetTime: now + config.windowMs };
    socketRateLimitStore.set(key, entry);
  }
  entry.count++;
  return {
    isLimited: entry.count > config.maxEvents,
    remaining: Math.max(0, config.maxEvents - entry.count),
    resetTime: entry.resetTime,
  };
}

export const RATE_LIMITS = {
  GAME_ACTION:  { maxRequests: 30,  windowMs: 60 * 1000 },
  TIMER:        { maxRequests: 60,  windowMs: 60 * 1000 },
  READ:         { maxRequests: 120, windowMs: 60 * 1000 },
  DESTRUCTIVE:  { maxRequests: 5,   windowMs: 60 * 1000 },
} as const;

export const SOCKET_RATE_LIMITS = {
  GAME_ACTION: { maxEvents: 30, windowMs: 60 * 1000 },
  TIMER:       { maxEvents: 60, windowMs: 60 * 1000 },
  DESTRUCTIVE: { maxEvents: 5,  windowMs: 60 * 1000 },
} as const;
