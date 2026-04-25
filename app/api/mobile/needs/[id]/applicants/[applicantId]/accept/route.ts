// app/api/mobile/needs/[id]/applicants/[applicantId]/accept/route.ts
// PATCH — applicant accepts the confirmed work offer

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import UserModel from '@/app/lib/models/user'
import { verifyToken } from '@/app/lib/mobile/verifyToken'
import { serializeApplicant } from '@/app/lib/mobile/serializers'
import Applicant from '@/app/lib/models/applicant'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; applicantId: string }> }
) {
  const tokenPayload = await verifyToken(req)
  if (!tokenPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: needId, applicantId } = await params

  if (!/^[a-f\d]{24}$/i.test(needId)) {
    return NextResponse.json({ error: 'Invalid need ID' }, { status: 400 })
  }
  if (!/^[a-f\d]{24}$/i.test(applicantId)) {
    return NextResponse.json({ error: 'Invalid applicant ID' }, { status: 400 })
  }

  try {
    await connectToDatabase()

    const applicant = await Applicant.findOne({ _id: applicantId, needId })
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

    return NextResponse.json({ applicant: serializeApplicant(applicant.toObject()) })
  } catch (err) {
    console.error('[mobile/needs/applicants/accept PATCH]', err)
    return NextResponse.json({ error: 'Failed to accept offer' }, { status: 500 })
  }
}
