// app/api/mobile/issues/[id]/commission/rating/route.ts
// POST — contributor submits a quality rating for completed work

import { isValidObjectId } from '@/app/lib/utils/validation'
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import Commission from '@/app/lib/models/commission'
import Pledge from '@/app/lib/models/pledge'
import Applicant from '@/app/lib/models/applicant'
import Rating from '@/app/lib/models/rating'

export const POST = withAuth(async (req, token, ctx) => {
  const { id: issueId } = await ctx.params
  if (!isValidObjectId(issueId)) return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })

  const { score } = await req.json()
  if (!Number.isInteger(score) || score < 1 || score > 5)
    return NextResponse.json({ error: 'Score must be an integer between 1 and 5' }, { status: 400 })

  try {
    await connectToDatabase()

    const commission = await Commission.findOne({ issueId }).lean() as any
    if (!commission) return NextResponse.json({ error: 'No commission found' }, { status: 404 })
    if (commission.status !== 'approved')
      return NextResponse.json({ error: 'Can only rate approved commissions' }, { status: 400 })

    const pledge = await Pledge.findOne({ issueId, userId: token.id }).lean()
    if (!pledge) return NextResponse.json({ error: 'Only contributors can rate' }, { status: 403 })

    const acceptedApplicant = await Applicant.findOne({ issueId, status: 'accepted' }).lean() as any
    if (!acceptedApplicant) return NextResponse.json({ error: 'No accepted applicant found' }, { status: 404 })

    await Rating.findOneAndUpdate(
      { commissionId: commission._id, raterId: token.id },
      { issueId, commissionId: commission._id, raterId: token.id, workerId: acceptedApplicant.userId, score },
      { upsert: true }
    )

    return NextResponse.json({ score })
  } catch (err: any) {
    console.error('[commission/rating POST]', err)
    return NextResponse.json({ error: 'Failed to submit rating' }, { status: 500 })
  }
})
