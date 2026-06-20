// api/middleware/rate-limit.ts
import { createMiddleware } from 'hono/factory'
import { getConnInfo } from '@hono/node-server/conninfo'

interface RateEntry { count: number; resetAt: number }

function makeRateLimiter(maxRequests: number, windowMs: number) {
  const store = new Map<string, RateEntry>()

  return createMiddleware(async (c, next) => {
    let ip: string
    try {
      ip = getConnInfo(c).remote.address ?? 'unknown'
    } catch {
      ip = c.req.header('x-real-ip') ?? c.req.header('x-forwarded-for')?.split(',')[0].trim() ?? 'unknown'
    }

    const now = Date.now()
    const entry = store.get(ip)

    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs })
    } else {
      entry.count++
      if (entry.count > maxRequests) {
        return c.json({ error: 'Too many requests' }, 429)
      }
    }

    await next()
  })
}

export const globalRateLimit = makeRateLimiter(120, 60_000)  // 120 req/min per IP
export const loginRateLimit = makeRateLimiter(5, 60_000)     // 5 req/min per IP
