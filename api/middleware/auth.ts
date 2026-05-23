// api/middleware/auth.ts
// Hono auth middleware — replaces Next.js withAuth + verifyToken

import { createMiddleware } from 'hono/factory'
import { jwtVerify } from 'jose'

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET || 'change-this-secret')

export type TokenPayload = { id: string; role?: string }

export const authMiddleware = createMiddleware<{ Variables: { token: TokenPayload } }>(
  async (c, next) => {
    const auth = c.req.header('authorization')
    if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401)
    try {
      const { payload } = await jwtVerify(auth.slice(7), secret)
      c.set('token', payload as TokenPayload)
      await next()
    } catch {
      return c.json({ error: 'Unauthorized' }, 401)
    }
  }
)
