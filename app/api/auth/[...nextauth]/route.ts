import { handlers } from "@/app/lib/auth"
import { NextRequest } from "next/server"

export function GET(req: NextRequest) {
  return handlers.GET(req)
}

export function POST(req: NextRequest) {
  return handlers.POST(req)
}
