import { handlers } from "@/app/lib/auth"
import { NextRequest } from "next/server"

// NextAuth v5 beta.30 returns undefined on some paths (signout, CSRF checks).
// Cast through any so ?? can provide the fallback Next.js 15 requires.
export async function GET(req: NextRequest): Promise<Response> {
  return (await (handlers.GET as any)(req)) ?? new Response(null, { status: 200 })
}

export async function POST(req: NextRequest): Promise<Response> {
  return (await (handlers.POST as any)(req)) ?? new Response(null, { status: 200 })
}
