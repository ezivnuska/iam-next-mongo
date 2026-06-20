import { handlers } from "@/app/lib/auth"
import { NextRequest, NextResponse } from "next/server"

// NextAuth v5 beta.30 needs ctx.params.nextauth to determine which action
// to run (signout, session, csrf, etc). Wrapping without forwarding ctx
// causes handlers to return undefined — hence "no response returned".
// Cast through any to bypass the incorrect 1-arg TypeScript type.

export async function GET(req: NextRequest, ctx: any): Promise<Response> {
  try {
    return (await (handlers.GET as any)(req, ctx)) ?? new Response(null, { status: 200 })
  } catch (err) {
    console.error('[auth/GET]', err)
    return new Response(null, { status: 200 })
  }
}

export async function POST(req: NextRequest, ctx: any): Promise<Response> {
  try {
    return (await (handlers.POST as any)(req, ctx)) ?? new Response(null, { status: 200 })
  } catch (err) {
    console.error('[auth/POST]', err)
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
