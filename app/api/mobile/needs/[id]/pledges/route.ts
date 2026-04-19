// app/api/mobile/needs/[id]/pledges/route.ts
// POST — create a pledge for a need

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { verifyToken } from '@/app/lib/mobile/verifyToken'
import Pledge from '@/app/lib/models/pledge'
import Need from '@/app/lib/models/need'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tokenPayload = await verifyToken(req)
  if (!tokenPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  if (!/^[a-f\d]{24}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid need ID' }, { status: 400 })
  }

  try {
    const { amount } = await req.json()

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
    }

    await connectToDatabase()

    const need = await Need.findById(id).lean()
    if (!need) {
      return NextResponse.json({ error: 'Need not found' }, { status: 404 })
    }

    const pledge = await Pledge.create({
      userId: tokenPayload.id,
      needId: id,
      amount,
    })

    return NextResponse.json({
      pledge: {
        id: pledge._id.toString(),
        userId: pledge.userId.toString(),
        needId: pledge.needId.toString(),
        amount: pledge.amount,
        createdAt: pledge.createdAt.toISOString(),
      },
    }, { status: 201 })
  } catch (err) {
    console.error('[mobile/needs/pledges POST]', err)
    return NextResponse.json({ error: 'Failed to create pledge' }, { status: 500 })
  }
}
