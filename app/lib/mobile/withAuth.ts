// app/lib/mobile/withAuth.ts
// Wraps a route handler with token verification, eliminating the repeated verifyToken + 401 guard.

import { NextRequest, NextResponse } from 'next/server'
import { verifyToken } from './verifyToken'

type TokenPayload = { id: string; role?: string }
type RouteContext = { params: Promise<Record<string, string>> }
type AuthedHandler = (req: NextRequest, token: TokenPayload, ctx: RouteContext) => Promise<NextResponse>

export function withAuth(handler: AuthedHandler) {
  return async (req: NextRequest, ctx: RouteContext): Promise<NextResponse> => {
    const token = await verifyToken(req)
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    return handler(req, token, ctx)
  }
}
