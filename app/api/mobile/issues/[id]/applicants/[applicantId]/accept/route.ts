// app/api/mobile/issues/[id]/applicants/[applicantId]/accept/route.ts
// PATCH — applicant accepts the confirmed work offer.
//         Deny-voter pledges are removed; remaining pledgers are charged immediately.

import { isValidObjectId } from '@/app/lib/utils/validation'
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import { serializeApplicant } from '@/app/lib/mobile/serializers'
import { midnightFollowingDay } from '@/app/lib/mobile/deadlines'
import { getIssueAudienceIds, emitIssueApplicantAccepted } from '@/app/lib/socket/emit'
import Applicant from '@/app/lib/models/applicant'
import Pledge from '@/app/lib/models/pledge'
import UserModel from '@/app/lib/models/user'
import stripe from '@/app/lib/stripe'

export const PATCH = withAuth(async (req, token, ctx) => {
  const { id: needId, applicantId } = await ctx.params

  if (!isValidObjectId(needId)) return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })
  if (!isValidObjectId(applicantId)) return NextResponse.json({ error: 'Invalid applicant ID' }, { status: 400 })

  try {
    await connectToDatabase()

    const applicant = await Applicant.findOne({ _id: applicantId, issueId: needId })
    if (!applicant) return NextResponse.json({ error: 'Applicant not found' }, { status: 404 })
    if (applicant.userId.toString() !== token.id)
      return NextResponse.json({ error: 'Only the applicant can accept' }, { status: 403 })
    if (applicant.status !== 'confirmed')
      return NextResponse.json({ error: 'Can only accept a confirmed offer' }, { status: 400 })

    const user = await UserModel.findById(token.id).lean() as any
    if (!user?.stripeAccountId || !user?.stripeAccountEnabled)
      return NextResponse.json({ error: 'A payout account is required to accept work', code: 'NO_STRIPE_ACCOUNT' }, { status: 402 })

    applicant.status = 'accepted'
    applicant.acceptedAt = new Date()
    applicant.completionDeadline = midnightFollowingDay()
    await applicant.save()

    // Remove pledges from contributors who voted to deny this applicant
    const denyVoterIds = applicant.votes
      .filter((v: any) => v.vote === 'deny')
      .map((v: any) => v.userId.toString())

    if (denyVoterIds.length > 0) {
      await Pledge.deleteMany({ issueId: needId, userId: { $in: denyVoterIds } })
    }

    // Charge all remaining pledgers immediately
    const pledges = await Pledge.find({ issueId: needId }).lean() as any[]
    if (pledges.length > 0) {
      const pledgerIds = pledges.map((p) => p.userId)
      const pledgers = await UserModel.find({ _id: { $in: pledgerIds } }).lean() as any[]
      const pledgerMap = new Map(pledgers.map((u) => [u._id.toString(), u]))

      await Promise.allSettled(
        pledges.map(async (p) => {
          const pledger = pledgerMap.get(p.userId.toString())
          if (!pledger?.stripeCustomerId || !pledger?.stripeDefaultPaymentMethodId) {
            console.warn('[accept] pledger has no payment method, removing pledge', p._id)
            await Pledge.findByIdAndDelete(p._id)
            return
          }
          try {
            const pi = await stripe.paymentIntents.create({
              amount: Math.round(p.amount * 100),
              currency: 'usd',
              customer: pledger.stripeCustomerId,
              payment_method: pledger.stripeDefaultPaymentMethodId,
              capture_method: 'automatic',
              confirm: true,
              off_session: true,
            })
            await Pledge.findByIdAndUpdate(p._id, { stripePaymentIntentId: pi.id })
          } catch (err: any) {
            console.error('[accept] charge failed for pledger', p.userId, err?.message)
            await Pledge.findByIdAndDelete(p._id)
          }
        })
      )
    }

    const serialized = serializeApplicant(applicant.toObject())
    getIssueAudienceIds(needId, applicant.userId.toString()).then((audience) =>
      emitIssueApplicantAccepted({ issueId: needId, applicant: serialized }, audience)
    ).catch((err: any) => console.warn('[socket]', err?.message ?? err))
    return NextResponse.json({ applicant: serialized })
  } catch (err) {
    console.error('[mobile/issues/applicants/accept PATCH]', err)
    return NextResponse.json({ error: 'Failed to accept offer' }, { status: 500 })
  }
})
