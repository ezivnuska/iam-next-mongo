// app/api/pledges/[id]/route.ts

import { isValidObjectId } from '@iam/shared-types'
import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import Pledge from '@/app/lib/models/pledge'
import Issue from '@/app/lib/models/issue'
import '@/app/lib/models/user'
import '@/app/lib/models/image'
import { serializePledge, type LeanDoc } from '@/app/lib/mobile/serializers'
import { logActivity, getRequestMetadata } from '@/app/lib/utils/activity-logger'
import { requireAuthFlexible } from '@/app/lib/utils/auth/flexible'
import { UnauthorizedError } from '@/app/lib/utils/auth'

const POPULATE_CONFIG = {
  path: 'userId',
  select: '_id username avatar',
  populate: { path: 'avatar', select: '_id variants' },
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuthFlexible(req)

    const { id } = await params

    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid pledge ID' }, { status: 400 })
    }

    await connectToDatabase()

    const pledge = await Pledge.findById(id).populate(POPULATE_CONFIG).lean()
    if (!pledge) {
      return NextResponse.json({ error: 'Pledge not found' }, { status: 404 })
    }

    return NextResponse.json({ pledge: serializePledge(pledge as unknown as LeanDoc) })
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching pledge:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthFlexible(req)
    const { id } = await params

    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid pledge ID' }, { status: 400 })
    }

    const { amount } = await req.json()

    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
    }

    await connectToDatabase()

    const pledge = await Pledge.findById(id)
    if (!pledge) {
      return NextResponse.json({ error: 'Pledge not found' }, { status: 404 })
    }

    const isOwner = pledge.userId.toString() === user.id
    const isAdmin = user.role === 'admin'

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    pledge.amount = amount
    await pledge.save()
    await pledge.populate(POPULATE_CONFIG)

    const serialized = serializePledge(pledge.toObject() as unknown as LeanDoc)

    await logActivity({
      userId: user.id,
      action: 'update',
      entityType: 'pledge',
      entityId: pledge._id,
      entityData: { amount },
      metadata: getRequestMetadata(req),
    })

    return NextResponse.json({ pledge: serialized })
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating pledge:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuthFlexible(req)
    const { id } = await params

    if (!isValidObjectId(id)) {
      return NextResponse.json({ error: 'Invalid pledge ID' }, { status: 400 })
    }

    await connectToDatabase()

    const pledge = await Pledge.findById(id).lean()
    if (!pledge) {
      return NextResponse.json({ error: 'Pledge not found' }, { status: 404 })
    }

    type LeanPledge = { userId: { toString(): string }; issueId: { toString(): string }; amount: number }
    const p = pledge as unknown as LeanPledge
    const isOwner = p.userId.toString() === user.id
    const isAdmin = user.role === 'admin'

    if (!isOwner && !isAdmin) {
      const need = await Issue.findById(p.issueId).lean()
      if (!need || (need as unknown as { author: { toString(): string } }).author.toString() !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    await Pledge.findByIdAndDelete(id)

    await logActivity({
      userId: user.id,
      action: 'delete',
      entityType: 'pledge',
      entityId: id,
      entityData: { issueId: p.issueId.toString(), amount: p.amount },
      metadata: getRequestMetadata(req),
    })

    return NextResponse.json({ ok: true })
  } catch (err: unknown) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error deleting pledge:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
