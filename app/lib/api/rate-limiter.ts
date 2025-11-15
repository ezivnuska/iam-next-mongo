// app/lib/api/rate-limiter.ts

/**
 * Simple in-memory token bucket rate limiter
 *
 * Limits requests per user/IP to prevent abuse
 * Note: In-memory storage means limits reset on server restart (acceptable for serverless)
 */

interface RateLimitConfig {
  /** Maximum number of requests allowed in the time window */
  maxRequests: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Optional custom key generator (defaults to userId or IP) */
  keyGenerator?: (request: Request, userId?: string) => string;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory storage for rate limit data
const rateLimitStore = new Map<string, RateLimitEntry>();

// Cleanup old entries every 10 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 10 * 60 * 1000);

/**
 * Check if a request should be rate limited
 *
 * @param request - The incoming request
 * @param config - Rate limit configuration
 * @param userId - Optional user ID for authenticated requests
 * @returns Object with isLimited flag and remaining requests
 */
export function checkRateLimit(
  request: Request,
  config: RateLimitConfig,
  userId?: string
): { isLimited: boolean; remaining: number; resetTime: number } {
  const now = Date.now();

  // Generate a unique key for this request
  const key = config.keyGenerator
    ? config.keyGenerator(request, userId)
    : getDefaultKey(request, userId);

  // Get or create rate limit entry
  let entry = rateLimitStore.get(key);

  // Reset if window has expired
  if (!entry || entry.resetTime < now) {
    entry = {
      count: 0,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, entry);
  }

  // Increment request count
  entry.count++;

  // Check if limit exceeded
  const isLimited = entry.count > config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);

  return {
    isLimited,
    remaining,
    resetTime: entry.resetTime,
  };
}

/**
 * Default key generator - uses userId if available, otherwise IP address
 */
function getDefaultKey(request: Request, userId?: string): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Try to get IP from headers (works with most proxies/load balancers)
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0] ||
    request.headers.get('x-real-ip') ||
    'unknown';

  return `ip:${ip}`;
}

/**
 * Higher-order function to wrap route handlers with rate limiting
 *
 * @example
 * ```ts
 * export const POST = withRateLimit(
 *   { maxRequests: 10, windowMs: 60000 },
 *   async (request) => {
 *     // Your handler code
 *     return Response.json({ success: true });
 *   }
 * );
 * ```
 */
export function withRateLimit<T extends any[]>(
  config: RateLimitConfig,
  handler: (request: Request, ...args: T) => Promise<Response>
) {
  return async (request: Request, ...args: T): Promise<Response> => {
    // Extract userId if available (for authenticated requests)
    let userId: string | undefined;
    try {
      const { auth } = await import('@/app/lib/auth');
      const session = await auth();
      userId = session?.user?.id;
    } catch {
      // Not authenticated or error getting session - continue with IP-based limiting
    }

    // Check rate limit
    const { isLimited, remaining, resetTime } = checkRateLimit(request, config, userId);

    if (isLimited) {
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000);

      return Response.json(
        {
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': config.maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(resetTime).toISOString(),
          },
        }
      );
    }

    // Add rate limit headers to response
    const response = await handler(request, ...args);

    // Clone response to add headers
    const headers = new Headers(response.headers);
    headers.set('X-RateLimit-Limit', config.maxRequests.toString());
    headers.set('X-RateLimit-Remaining', remaining.toString());
    headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString());

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

/**
 * Preset rate limit configurations for common use cases
 */
export const RATE_LIMITS = {
  /** Strict limit for game actions (30 requests per minute) */
  GAME_ACTION: {
    maxRequests: 30,
    windowMs: 60 * 1000,
  },
  /** Medium limit for timer operations (60 requests per minute) */
  TIMER: {
    maxRequests: 60,
    windowMs: 60 * 1000,
  },
  /** Generous limit for read operations (120 requests per minute) */
  READ: {
    maxRequests: 120,
    windowMs: 60 * 1000,
  },
  /** Very strict limit for destructive operations (5 requests per minute) */
  DESTRUCTIVE: {
    maxRequests: 5,
    windowMs: 60 * 1000,
  },
} as const;
