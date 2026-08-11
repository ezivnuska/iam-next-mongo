// Issues API is handled by the Hono mobile layer at /api/mobile/issues/:id.
// These stubs satisfy Next.js route type validation.
import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({ error: 'Use /api/mobile/issues/:id' }, { status: 410 })
}

export async function PUT() {
  return NextResponse.json({ error: 'Use /api/mobile/issues/:id' }, { status: 410 })
}

export async function DELETE() {
  return NextResponse.json({ error: 'Use /api/mobile/issues/:id' }, { status: 410 })
}
