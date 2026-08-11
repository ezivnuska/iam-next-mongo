// Issues API is handled by the Hono mobile layer at /api/mobile/issues.
// These stubs satisfy Next.js route type validation.
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ error: 'Use /api/mobile/issues' }, { status: 410 })
}

export async function POST() {
  return NextResponse.json({ error: 'Use /api/mobile/issues' }, { status: 410 })
}
