// app/api/mobile/issues/[id]/commission/rating/route.ts
// POST — author or contributor submits a quality rating (0–5) for completion evidence.
// 0 = no stars (unacceptable); 1–5 = quality score.
// Can be submitted while evidence is pending or after approval.

import { isValidObjectId } from '@/app/lib/utils/validation'
import { NextResponse } from 'next/server'
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
  if (!Number.isInteger(score) || score < 0 || score > 5)
    return NextResponse.json({ error: 'Score must be an integer between 0 and 5' }, { status: 400 })

  try {
    await connectToDatabase()

    const issue = await Issue.findById(issueId).select('completion author').lean() as any
    if (!issue?.completion) return NextResponse.json({ error: 'No completion found' }, { status: 404 })
    if (!['pending', 'approved'].includes(issue.completion.status))
      return NextResponse.json({ error: 'Completion is not available for rating' }, { status: 400 })

    const isAuthor = issue.author.toString() === token.id
    if (!isAuthor) {
      const pledge = await Pledge.findOne({ issueId, userId: token.id }).lean()
      if (!pledge) return NextResponse.json({ error: 'Only the author or contributors can rate' }, { status: 403 })
    }

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
