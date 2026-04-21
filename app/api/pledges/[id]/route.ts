// app/api/pledges/[id]/route.ts

import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import Pledge from '@/app/lib/models/pledge'
import Need from '@/app/lib/models/need'
import '@/app/lib/models/user'
import '@/app/lib/models/image'
import type { Types } from 'mongoose'
import type { ImageVariant } from '@/app/lib/definitions/image'
import { transformPopulatedAuthor } from '@/app/lib/utils/transformers'
import { logActivity, getRequestMetadata } from '@/app/lib/utils/activity-logger'
import { requireAuth } from '@/app/lib/utils/auth'

interface PopulatedPledgeObj {
  _id: Types.ObjectId
  userId: {
    _id: Types.ObjectId
    username: string
    avatar?: {
      _id: Types.ObjectId
      userId: Types.ObjectId
      username: string
      alt?: string
      variants: ImageVariant[]
    }
  }
  needId: Types.ObjectId
  amount: number
  createdAt: Date
  updatedAt: Date
}

function transformPledge(p: PopulatedPledgeObj) {
  return {
    id: p._id.toString(),
    needId: p.needId.toString(),
    amount: p.amount,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    user: transformPopulatedAuthor(p.userId),
  }
}

const POPULATE_CONFIG = {
  path: 'userId',
  select: '_id username avatar',
  populate: { path: 'avatar', select: '_id variants' },
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAuth()

    const { id } = await params

    if (!/^[a-f\d]{24}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid pledge ID' }, { status: 400 })
    }

    await connectToDatabase()

    const pledge = await Pledge.findById(id).populate(POPULATE_CONFIG).lean()

    if (!pledge) {
      return NextResponse.json({ error: 'Pledge not found' }, { status: 404 })
    }

    return NextResponse.json({ pledge: transformPledge(pledge as unknown as PopulatedPledgeObj) })
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching pledge:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    if (!/^[a-f\d]{24}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid pledge ID' }, { status: 400 })
    }

    const { amount } = await req.json()

    if (typeof amount !== 'number' || amount <= 0) {
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

    const populated = pledge.toObject() as unknown as PopulatedPledgeObj

    await logActivity({
      userId: user.id,
      action: 'update',
      entityType: 'pledge',
      entityId: populated._id,
      entityData: { amount },
      metadata: getRequestMetadata(req),
    })

    return NextResponse.json({ pledge: transformPledge(populated) })
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error updating pledge:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth()
    const { id } = await params

    if (!/^[a-f\d]{24}$/i.test(id)) {
      return NextResponse.json({ error: 'Invalid pledge ID' }, { status: 400 })
    }

    await connectToDatabase()

    const pledge = await Pledge.findById(id).lean()
    if (!pledge) {
      return NextResponse.json({ error: 'Pledge not found' }, { status: 404 })
    }

    const isOwner = (pledge as any).userId.toString() === user.id
    const isAdmin = user.role === 'admin'

    if (!isOwner && !isAdmin) {
      // Need author can also delete pledges on their need
      const need = await Need.findById((pledge as any).needId).lean()
      if (!need || (need as any).author.toString() !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    await Pledge.findByIdAndDelete(id)

    await logActivity({
      userId: user.id,
      action: 'delete',
      entityType: 'pledge',
      entityId: id,
      entityData: { needId: (pledge as any).needId.toString(), amount: (pledge as any).amount },
      metadata: getRequestMetadata(req),
    })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error deleting pledge:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
