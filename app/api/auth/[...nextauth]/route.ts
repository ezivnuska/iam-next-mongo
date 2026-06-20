import { handlers } from "@/app/lib/auth"
import { NextRequest } from "next/server"

export function GET(req: NextRequest, ctx: unknown) {
  return handlers.GET(req, ctx as any)
}

export function POST(req: NextRequest, ctx: unknown) {
  return handlers.POST(req, ctx as any)
}
