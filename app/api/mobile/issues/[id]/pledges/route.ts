// app/api/mobile/issues/[id]/pledges/route.ts
// POST — create a pledge for an issue (requires saved payment method)

import { isValidObjectId, USER_WITH_AVATAR_POPULATE } from '@/app/lib/utils/validation'
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import { serializePledge, serializeApplicant } from '@/app/lib/mobile/serializers'
import { createPledgeWithPaymentIntent } from '@/app/lib/mobile/createPledge'
import { emitIssuePledgeAdded, emitIssueApplicantAccepted, getIssueAudienceIds } from '@/app/lib/socket/emit'
import Issue from '@/app/lib/models/issue'
import Pledge from '@/app/lib/models/pledge'
import Applicant from '@/app/lib/models/applicant'
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

    // Auto-accept the first pending applicant whose bid is now met
    const allPledges = await Pledge.find({ issueId: id }).lean()
    const total = allPledges.reduce((sum, p) => sum + p.amount, 0)
    const alreadyAccepted = await Applicant.exists({ issueId: id, status: 'accepted' })
    if (!alreadyAccepted) {
      const funded = await Applicant.findOne({
        issueId: id,
        status: 'pending',
        bidAmount: { $lte: total, $exists: true, $ne: null },
      }).sort({ createdAt: 1 })
      if (funded) {
        const deadline = new Date()
        deadline.setDate(deadline.getDate() + 1)
        deadline.setHours(23, 59, 59, 999)
        funded.status = 'accepted'
        funded.acceptedAt = new Date()
        funded.completionDeadline = deadline
        await funded.save()
        const serializedApplicant = serializeApplicant(funded.toObject())
        getIssueAudienceIds(id, funded.userId.toString()).then((audience) =>
          emitIssueApplicantAccepted({ issueId: id, applicant: serializedApplicant }, audience)
        ).catch((err: any) => console.warn('[socket]', err?.message ?? err))
      }
    }

    return NextResponse.json({ pledge: serialized }, { status: 201 })
  } catch (err: any) {
    if (err.code === 'NO_PAYMENT_METHOD')
      return NextResponse.json({ error: err.message, code: 'NO_PAYMENT_METHOD' }, { status: 402 })
    console.error('[mobile/issues/pledges POST]', err)
    return NextResponse.json({ error: 'Failed to create pledge' }, { status: 500 })
  }
})
