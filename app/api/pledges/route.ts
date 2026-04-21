// app/api/pledges/route.ts

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

export async function GET(req: Request) {
  try {
    await requireAuth()

    const { searchParams } = new URL(req.url)
    const needId = searchParams.get('needId')

    if (needId && !/^[a-f\d]{24}$/i.test(needId)) {
      return NextResponse.json({ error: 'Invalid need ID' }, { status: 400 })
    }

    await connectToDatabase()

    const query = needId ? { needId } : {}
    const pledges = await Pledge.find(query)
      .sort({ createdAt: 1 })
      .populate({ path: 'userId', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } })
      .lean()

    return NextResponse.json({
      pledges: (pledges as unknown as PopulatedPledgeObj[]).map(transformPledge),
    })
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error fetching pledges:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const { id: userId } = await requireAuth()

    const { needId, amount } = await req.json()

    if (!needId || !/^[a-f\d]{24}$/i.test(needId)) {
      return NextResponse.json({ error: 'Invalid need ID' }, { status: 400 })
    }

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
    }

    await connectToDatabase()

    const need = await Need.findById(needId).lean()
    if (!need) {
      return NextResponse.json({ error: 'Need not found' }, { status: 404 })
    }

    const pledge = await Pledge.create({ userId, needId, amount })

    await pledge.populate({
      path: 'userId',
      select: '_id username avatar',
      populate: { path: 'avatar', select: '_id variants' },
    })

    const populated = pledge.toObject() as unknown as PopulatedPledgeObj

    await logActivity({
      userId,
      action: 'create',
      entityType: 'pledge',
      entityId: populated._id,
      entityData: { needId, amount },
      metadata: getRequestMetadata(req),
    })

    return NextResponse.json({ pledge: transformPledge(populated) }, { status: 201 })
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating pledge:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
