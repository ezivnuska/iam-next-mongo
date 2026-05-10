// app/api/mobile/issues/[id]/commission/rating/route.ts
// POST — contributor submits a quality rating for completed work

import { isValidObjectId } from '@/app/lib/utils/validation'
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import Issue from '@/app/lib/models/issue'
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

    const issue = await Issue.findById(issueId).select('completion').lean() as any
    if (!issue?.completion) return NextResponse.json({ error: 'No commission found' }, { status: 404 })
    if (issue.completion.status !== 'approved')
      return NextResponse.json({ error: 'Can only rate approved commissions' }, { status: 400 })

    const pledge = await Pledge.findOne({ issueId, userId: token.id }).lean()
    if (!pledge) return NextResponse.json({ error: 'Only contributors can rate' }, { status: 403 })

    const acceptedApplicant = await Applicant.findOne({ issueId, status: 'accepted' }).lean() as any
    if (!acceptedApplicant) return NextResponse.json({ error: 'No accepted applicant found' }, { status: 404 })

    const commissionId = issue.completion._id

    await Rating.findOneAndUpdate(
      { commissionId, raterId: token.id },
      { issueId, commissionId, raterId: token.id, workerId: acceptedApplicant.userId, score },
      { upsert: true }
    )

    return NextResponse.json({ score })
  } catch (err: any) {
    console.error('[commission/rating POST]', err)
    return NextResponse.json({ error: 'Failed to submit rating' }, { status: 500 })
  }
})
