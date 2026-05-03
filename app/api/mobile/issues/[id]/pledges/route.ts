// app/api/mobile/needs/[id]/pledges/route.ts
// POST — create a pledge for a need (requires saved payment method)

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { verifyToken } from '@/app/lib/mobile/verifyToken'
import { serializePledge } from '@/app/lib/mobile/serializers'
import Issue from '@/app/lib/models/issue'
import { createPledgeWithPaymentIntent } from '@/app/lib/mobile/createPledge'
import { getIssueAudienceIds, emitIssuePledgeAdded } from '@/app/lib/socket/emit'
import '@/app/lib/models/image'
import '@/app/lib/models/user'

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
    return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })
  }

  try {
    const { amount } = await req.json()

    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })
    }

    await connectToDatabase()

    const issue = await Issue.findById(id).lean()
    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    const pledge = await createPledgeWithPaymentIntent(tokenPayload.id, id, amount)
    await pledge.populate({ path: 'userId', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } })

    const serialized = serializePledge(pledge.toObject())
    getIssueAudienceIds(id).then((audience) =>
      emitIssuePledgeAdded({ issueId: id, pledge: serialized }, audience)
    ).catch(() => {})
    return NextResponse.json({ pledge: serialized }, { status: 201 })
  } catch (err: any) {
    if (err.code === 'NO_PAYMENT_METHOD') {
      return NextResponse.json({ error: err.message, code: 'NO_PAYMENT_METHOD' }, { status: 402 })
    }
    console.error('[mobile/issues/pledges POST]', err)
    return NextResponse.json({ error: 'Failed to create pledge' }, { status: 500 })
  }
}
