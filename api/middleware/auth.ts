// api/middleware/auth.ts
// Hono auth middleware — replaces Next.js withAuth + verifyToken

import { createMiddleware } from 'hono/factory'
import { jwtVerify } from 'jose'
import { getMobileSecret, getGamesSecret } from '@/app/lib/jwt'

export type TokenPayload = { id: string; role?: string }

export const authMiddleware = createMiddleware<{ Variables: { token: TokenPayload } }>(
  async (c, next) => {
    const auth = c.req.header('authorization')
    if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401)
    const token = auth.slice(7)
    for (const getSecret of [getMobileSecret, getGamesSecret]) {
      try {
        const { payload } = await jwtVerify(token, getSecret())
        c.set('token', payload as TokenPayload)
        await next()
        return
      } catch { /* try next secret */ }
    }
    return c.json({ error: 'Unauthorized' }, 401)
  }
)
