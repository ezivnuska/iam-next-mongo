// app/lib/utils/auth/flexible.ts
// Accepts either a Bearer JWT (mobile) or a NextAuth session cookie (web)

import { jwtVerify } from 'jose'
import { auth } from '@/app/lib/auth'

const secret = new TextEncoder().encode(
  process.env.NEXTAUTH_SECRET || 'change-this-secret'
)

export async function requireAuthFlexible(req: Request): Promise<{ id: string; role?: string }> {
  const authHeader = req.headers.get('authorization')
  if (authHeader?.startsWith('Bearer ')) {
    try {
      const { payload } = await jwtVerify(authHeader.slice(7), secret)
      if (typeof payload.id === 'string') {
        return { id: payload.id, role: payload.role as string | undefined }
      }
    } catch {}
  }

  const session = await auth()
  if (session?.user?.id) {
    return { id: session.user.id, role: session.user.role as string | undefined }
  }

  throw new Error('Unauthorized')
}
