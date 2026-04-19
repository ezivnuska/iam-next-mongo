// app/api/mobile/needs/[id]/pledges/[pledgeId]/route.ts
// DELETE — remove a pledge (owner only)

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { verifyToken } from '@/app/lib/mobile/verifyToken'
import Pledge from '@/app/lib/models/pledge'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; pledgeId: string }> }
) {
  const tokenPayload = await verifyToken(req)
  if (!tokenPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { pledgeId } = await params

  if (!/^[a-f\d]{24}$/i.test(pledgeId)) {
    return NextResponse.json({ error: 'Invalid pledge ID' }, { status: 400 })
  }

  try {
    await connectToDatabase()

    const pledge = await Pledge.findById(pledgeId)
    if (!pledge) {
      return NextResponse.json({ error: 'Pledge not found' }, { status: 404 })
    }

    if (pledge.userId.toString() !== tokenPayload.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await pledge.deleteOne()

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[mobile/needs/pledges DELETE]', err)
    return NextResponse.json({ error: 'Failed to delete pledge' }, { status: 500 })
  }
}
