import { NextRequest, NextResponse } from 'next/server'

// Dedicated signout route — takes precedence over [...nextauth] for this path.
// NextAuth v5 beta.30's catch-all handler returns undefined on POST /signout,
// causing Next.js 15 to emit a 500. This clears the session cookie directly
// and returns the { url } shape the NextAuth client SDK expects.

export async function POST(req: NextRequest): Promise<Response> {
  const isProduction = process.env.NODE_ENV === 'production'
  const cookieName = isProduction
    ? '__Secure-next-auth.session-token'
    : 'next-auth.session-token'

  const res = NextResponse.json({ url: '/' })
  res.cookies.set(cookieName, '', {
    maxAge: 0,
    path: '/',
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
  })
  return res
}
