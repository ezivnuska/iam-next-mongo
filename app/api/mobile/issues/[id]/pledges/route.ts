// app/api/mobile/issues/[id]/pledges/route.ts
// POST — create a pledge for an issue (requires saved payment method)

import { isValidObjectId, USER_WITH_AVATAR_POPULATE } from '@/app/lib/utils/validation'
import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import { serializePledge, serializeApplicant } from '@/app/lib/mobile/serializers'
import { createPledgeWithPaymentIntent } from '@/app/lib/mobile/createPledge'
import {
  emitIssuePledgeAdded,
  emitIssueApplicantAccepted,
  getIssueAudienceIds,
} from '@/app/lib/socket/emit'
import Issue from '@/app/lib/models/issue'
import Pledge from '@/app/lib/models/pledge'
import Applicant from '@/app/lib/models/applicant'
import UserModel from '@/app/lib/models/user'
import '@/app/lib/models/image'
import '@/app/lib/models/user'

export const POST = withAuth(async (req, token, ctx) => {
  const { id } = await ctx.params
  if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })

  try {
    const body = await req.json()
    const { amount, applicantId, rescindIfLost, anonymous } = body

    if (typeof amount !== 'number' || amount <= 0)
      return NextResponse.json({ error: 'Amount must be a positive number' }, { status: 400 })

    if (applicantId && !isValidObjectId(applicantId))
      return NextResponse.json({ error: 'Invalid applicant ID' }, { status: 400 })

    await connectToDatabase()

    const issue = await Issue.findById(id).lean()
    if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 })

    // Block self-pledge on directed pledges
    if (applicantId) {
      const target = await Applicant.findOne({ _id: applicantId, issueId: id }).lean() as any
      if (!target) return NextResponse.json({ error: 'Applicant not found' }, { status: 404 })
      if (target.userId.toString() === token.id)
        return NextResponse.json({ error: 'You cannot pledge to your own bid' }, { status: 403 })
    }

    const pledge = await createPledgeWithPaymentIntent(token.id, id, amount)
    if (applicantId) pledge.applicantId = applicantId
    pledge.rescindIfLost = rescindIfLost === true
    pledge.anonymous = anonymous === true
    await pledge.save()
    await pledge.populate(USER_WITH_AVATAR_POPULATE)

    const serialized = serializePledge(pledge.toObject())
    emitIssuePledgeAdded({ issueId: id, actorId: token.id, pledge: serialized })
      .catch((err: any) => console.warn('[socket]', err?.message ?? err))

    // Check if any pending bid is now funded
    const alreadyAccepted = await Applicant.exists({ issueId: id, status: 'accepted' })
    if (!alreadyAccepted) {
      const allPledges = await Pledge.find({ issueId: id }).lean() as any[]
      const blanketTotal = allPledges
        .filter((p) => !p.applicantId)
        .reduce((s, p) => s + p.amount, 0)

      const pendingBidders = await Applicant.find({
        issueId: id,
        status: 'pending',
        bidAmount: { $exists: true, $ne: null },
      }).sort({ createdAt: 1 }).lean() as any[]

      const candidates = pendingBidders.filter((a) => {
        const directed = allPledges
          .filter((p) => p.applicantId?.toString() === a._id.toString())
          .reduce((s: number, p: any) => s + p.amount, 0)
        return directed + blanketTotal >= a.bidAmount
      })

      if (candidates.length > 0) {
        // Sort by reputation desc, then createdAt asc
        const userIds = candidates.map((a: any) => a.userId)
        const users = await UserModel.find({ _id: { $in: userIds } }).lean() as any[]
        const reputationMap = new Map(
          users.map((u: any) => [u._id.toString(), u.reputation?.average ?? -1])
        )
        candidates.sort((a: any, b: any) => {
          const repDiff = (reputationMap.get(b.userId.toString()) ?? -1) -
                          (reputationMap.get(a.userId.toString()) ?? -1)
          if (repDiff !== 0) return repDiff
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        })

        const winner = candidates[0]
        const deadline = new Date()
        deadline.setDate(deadline.getDate() + 1)
        deadline.setHours(23, 59, 59, 999)

        await Applicant.findByIdAndUpdate(winner._id, {
          status: 'accepted',
          acceptedAt: new Date(),
          completionDeadline: deadline,
        })

        // Resolve directed pledges for losing applicants
        const loserIds = candidates.slice(1).map((a: any) => a._id.toString())
        if (loserIds.length > 0) {
          await Pledge.updateMany(
            { issueId: id, applicantId: { $in: loserIds }, rescindIfLost: false },
            { $set: { applicantId: null } }
          )
          await Pledge.deleteMany(
            { issueId: id, applicantId: { $in: loserIds }, rescindIfLost: true }
          )
        }

        const accepted = await Applicant.findById(winner._id).lean() as any
        const serializedApplicant = serializeApplicant(accepted)
        getIssueAudienceIds(id, winner.userId.toString()).then((audience) =>
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
