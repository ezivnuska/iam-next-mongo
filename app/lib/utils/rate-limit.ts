// app/lib/utils/rate-limit.ts

interface RateEntry { count: number; resetAt: number }

function makeRateLimiter(maxRequests: number, windowMs: number) {
  const store = new Map<string, RateEntry>()

  // Prune expired entries once per window to prevent unbounded memory growth.
  // .unref() so the interval doesn't keep the process alive on shutdown.
  setInterval(() => {
    const now = Date.now()
    for (const [key, entry] of store) {
      if (now > entry.resetAt) store.delete(key)
    }
  }, windowMs).unref()

  return function checkRateLimit(ip: string): boolean {
    const now = Date.now()
    const entry = store.get(ip)
    if (!entry || now > entry.resetAt) {
      store.set(ip, { count: 1, resetAt: now + windowMs })
      return true
    }
    entry.count++
    return entry.count <= maxRequests
  }
}

export const checkRegisterRateLimit = makeRateLimiter(3, 3_600_000)   // 3 req/hr per IP
export const checkResendRateLimit = makeRateLimiter(5, 3_600_000)      // 5 req/hr per IP

export function getIp(req: Request): string {
  // Prefer x-real-ip (set by trusted proxies like nginx).
  // For x-forwarded-for, take the LAST entry — the nearest proxy appends
  // to the right, so the last IP cannot be spoofed by the client.
  const realIp = req.headers.get('x-real-ip')
  if (realIp) return realIp.trim()

  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const ips = forwarded.split(',').map(s => s.trim()).filter(Boolean)
    return ips[ips.length - 1] ?? 'unknown'
  }

  return 'unknown'
}
