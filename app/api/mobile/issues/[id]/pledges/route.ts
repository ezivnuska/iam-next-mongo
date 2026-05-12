// app/api/mobile/issues/[id]/pledges/route.ts
// POST — create a pledge for an issue (requires saved payment method)

import { isValidObjectId, USER_WITH_AVATAR_POPULATE } from '@/app/lib/utils/validation'
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import { serializePledge } from '@/app/lib/mobile/serializers'
import { createPledgeWithPaymentIntent } from '@/app/lib/mobile/createPledge'
import { emitIssuePledgeAdded } from '@/app/lib/socket/emit'
import Issue from '@/app/lib/models/issue'
import Pledge from '@/app/lib/models/pledge'
import '@/app/lib/models/image'
import '@/app/lib/models/user'

export const POST = withAuth(async (req, token, ctx) => {
  const { id } = await ctx.params
  if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })

  try {
    const { amount } = await req.json()
    if (typeof amount !== 'number' || amount <= 0)
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })

    await connectToDatabase()
    const issue = await Issue.findById(id).lean()
    if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 })

    const pledge = await createPledgeWithPaymentIntent(token.id, id, amount)
    await pledge.populate(USER_WITH_AVATAR_POPULATE)

    const serialized = serializePledge(pledge.toObject())
    emitIssuePledgeAdded({ issueId: id, actorId: token.id, pledge: serialized }).catch((err: any) => console.warn('[socket]', err?.message ?? err))
    return NextResponse.json({ pledge: serialized }, { status: 201 })
  } catch (err: any) {
    if (err.code === 'NO_PAYMENT_METHOD')
      return NextResponse.json({ error: err.message, code: 'NO_PAYMENT_METHOD' }, { status: 402 })
    console.error('[mobile/issues/pledges POST]', err)
    return NextResponse.json({ error: 'Failed to create pledge' }, { status: 500 })
  }
})
