// app/api/pledges/route.ts

import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import Pledge from '@/app/lib/models/pledge'
import Need from '@/app/lib/models/need'
import '@/app/lib/models/user'
import '@/app/lib/models/image'
import { serializePledge } from '@/app/lib/mobile/serializers'
import { logActivity, getRequestMetadata } from '@/app/lib/utils/activity-logger'
import { requireAuthFlexible } from '@/app/lib/utils/auth/flexible'

const POPULATE_CONFIG = {
  path: 'userId',
  select: '_id username avatar',
  populate: { path: 'avatar', select: '_id variants' },
}

export async function GET(req: Request) {
  try {
    await requireAuthFlexible(req)

    const { searchParams } = new URL(req.url)
    const needId = searchParams.get('needId')

    if (needId && !/^[a-f\d]{24}$/i.test(needId)) {
      return NextResponse.json({ error: 'Invalid need ID' }, { status: 400 })
    }

    await connectToDatabase()

    const query = needId ? { needId } : {}
    const pledges = await Pledge.find(query)
      .sort({ createdAt: 1 })
      .populate(POPULATE_CONFIG)
      .lean()

    return NextResponse.json({ pledges: pledges.map(serializePledge) })
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
    const { id: userId } = await requireAuthFlexible(req)

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
    await pledge.populate(POPULATE_CONFIG)

    const serialized = serializePledge(pledge.toObject())

    await logActivity({
      userId,
      action: 'create',
      entityType: 'pledge',
      entityId: pledge._id,
      entityData: { needId, amount },
      metadata: getRequestMetadata(req),
    })

    return NextResponse.json({ pledge: serialized }, { status: 201 })
  } catch (err: any) {
    if (err.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    console.error('Error creating pledge:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
