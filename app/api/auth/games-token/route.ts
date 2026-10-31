// app/api/auth/games-token/route.ts
// SSO handoff endpoint: requires a NextAuth session, issues a short-lived
// GAMES_TOKEN_SECRET-signed JWT, then redirects to games.iameric.me to
// complete the cross-site login.
//
// Flow:
//   1. User is unauthenticated on games.iameric.me
//   2. iam-games redirects to iameric.me/signin?redirect=<returnUrl>
//   3. After NextAuth login, authenticate.ts redirectTo points here
//   4. This route signs a 5-min token and redirects to
//      games.iameric.me/api/auth/verify?token=<jwt>&redirect=<returnUrl>

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth'
import { signGamesToken } from '@/app/lib/jwt'

const GAMES_ORIGIN = process.env.NEXT_PUBLIC_GAMES_URL ?? 'https://games.iameric.me'

export async function GET(req: NextRequest): Promise<Response> {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.redirect(new URL('/signin', req.url))
  }

  const redirect = req.nextUrl.searchParams.get('redirect') ?? '/'

  const token = await signGamesToken({
    id: session.user.id,
    username: session.user.username,
    role: session.user.role,
  })

  const verifyUrl = new URL('/api/auth/verify', GAMES_ORIGIN)
  verifyUrl.searchParams.set('token', token)
  verifyUrl.searchParams.set('redirect', redirect)

  return NextResponse.redirect(verifyUrl)
}
