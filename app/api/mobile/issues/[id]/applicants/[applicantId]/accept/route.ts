// app/api/mobile/issues/[id]/applicants/[applicantId]/accept/route.ts
// PATCH — applicant accepts the confirmed work offer

import { isValidObjectId } from '@/app/lib/utils/validation'
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import UserModel from '@/app/lib/models/user'
import { verifyToken } from '@/app/lib/mobile/verifyToken'
import { serializeApplicant } from '@/app/lib/mobile/serializers'
import { getIssueAudienceIds, emitIssueApplicantAccepted } from '@/app/lib/socket/emit'
import Applicant from '@/app/lib/models/applicant'
import Pledge from '@/app/lib/models/pledge'
import stripe from '@/app/lib/stripe'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; applicantId: string }> }
) {
  const tokenPayload = await verifyToken(req)
  if (!tokenPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: needId, applicantId } = await params

  if (!isValidObjectId(needId)) {
    return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })
  }
  if (!isValidObjectId(applicantId)) {
    return NextResponse.json({ error: 'Invalid applicant ID' }, { status: 400 })
  }

  try {
    await connectToDatabase()

    const applicant = await Applicant.findOne({ _id: applicantId, issueId: needId })
    if (!applicant) {
      return NextResponse.json({ error: 'Applicant not found' }, { status: 404 })
    }

    if (applicant.userId.toString() !== tokenPayload.id) {
      return NextResponse.json({ error: 'Only the applicant can accept' }, { status: 403 })
    }

    if (applicant.status !== 'confirmed') {
      return NextResponse.json({ error: 'Can only accept a confirmed offer' }, { status: 400 })
    }

    const user = await UserModel.findById(tokenPayload.id).lean() as any
    if (!user?.stripeAccountId || !user?.stripeAccountEnabled) {
      return NextResponse.json(
        { error: 'A payout account is required to accept work', code: 'NO_STRIPE_ACCOUNT' },
        { status: 402 }
      )
    }

    applicant.status = 'accepted'
    applicant.acceptedAt = new Date()
    await applicant.save()

    // Cancel PaymentIntents for deny voters — their funds will never be needed
    const denyVoterIds = new Set(
      applicant.votes
        .filter((v: any) => v.vote === 'deny')
        .map((v: any) => v.userId.toString())
    )

    if (denyVoterIds.size > 0) {
      const denyPledges = await Pledge.find({
        issueId: needId,
        stripePaymentIntentId: { $exists: true, $ne: null },
      }).lean() as any[]

      await Promise.allSettled(
        denyPledges
          .filter((p) => denyVoterIds.has(p.userId.toString()))
          .map(async (p) => {
            try {
              await stripe.paymentIntents.cancel(p.stripePaymentIntentId)
            } catch (err: any) {
              console.error('[accept] failed to cancel deny voter PI', p.stripePaymentIntentId, err?.message)
            }
          })
      )
    }

    const serialized = serializeApplicant(applicant.toObject())
    getIssueAudienceIds(needId, applicant.userId.toString()).then((audience) =>
      emitIssueApplicantAccepted({ issueId: needId, applicant: serialized }, audience)
    ).catch(() => {})
    return NextResponse.json({ applicant: serialized })
  } catch (err) {
    console.error('[mobile/issues/applicants/accept PATCH]', err)
    return NextResponse.json({ error: 'Failed to accept offer' }, { status: 500 })
  }
}
