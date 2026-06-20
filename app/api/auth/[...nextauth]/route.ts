import { handlers } from "@/app/lib/auth"
import { NextRequest, NextResponse } from "next/server"

// NextAuth v5 beta.30 returns undefined on some paths (CSRF checks) and can
// throw on signout when the session token is missing or malformed. Both cases
// must produce a valid Response so Next.js 15 doesn't swallow into a 500.

export async function GET(req: NextRequest): Promise<Response> {
  try {
    return (await (handlers.GET as any)(req)) ?? new Response(null, { status: 200 })
  } catch (err) {
    console.error('[auth/GET]', err)
    return new Response(null, { status: 200 })
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  try {
    return (await (handlers.POST as any)(req)) ?? new Response(null, { status: 200 })
  } catch (err) {
    console.error('[auth/POST]', err)
    // On signout failure: clear the cookie client-side and return the JSON
    // shape NextAuth's client SDK expects ({ url }) so it can redirect cleanly.
    const isSignout = new URL(req.url).pathname.endsWith('/signout')
    if (isSignout) {
      const cookieName = process.env.NODE_ENV === 'production'
        ? '__Secure-next-auth.session-token'
        : 'next-auth.session-token'
      const res = NextResponse.json({ url: '/' })
      res.cookies.set(cookieName, '', { maxAge: 0, path: '/' })
      return res
    }
    return NextResponse.json({ error: 'Auth error' }, { status: 500 })
  }
}
