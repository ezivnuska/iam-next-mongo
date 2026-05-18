// app/api/mobile/issues/[id]/commission/rating/route.ts
// POST — author or contributor submits a 1–5 quality rating.
// After all required raters (author + pledgers) have submitted, auto-approves if avg ≥ 4, auto-denies if avg < 4.

import { isValidObjectId, USER_WITH_AVATAR_POPULATE, APPLICANT_USER_POPULATE } from '@/app/lib/utils/validation'
import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import { calculateAverageRating } from '@/app/lib/utils/ratingUtils'
import { serializeCompletion, serializeIssue } from '@/app/lib/mobile/serializers'
import { settleIssue } from '@/app/lib/mobile/settleIssue'
import { getIssueAudienceIds, emitIssueCompletionReviewed } from '@/app/lib/socket/emit'
import { midnightFollowingDay } from '@/app/lib/mobile/deadlines'
import Issue from '@/app/lib/models/issue'
import Pledge from '@/app/lib/models/pledge'
import Applicant from '@/app/lib/models/applicant'
import Rating from '@/app/lib/models/rating'
import '@/app/lib/models/image'
import '@/app/lib/models/user'

export const POST = withAuth(async (req, token, ctx) => {
  const { id: issueId } = await ctx.params
  if (!isValidObjectId(issueId)) return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })

  const { score } = await req.json()
  if (!Number.isInteger(score) || score < 1 || score > 5)
    return NextResponse.json({ error: 'Score must be an integer between 1 and 5' }, { status: 400 })

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

    const allRatings = await Rating.find({ commissionId }).lean() as any[]
    const averageRating = calculateAverageRating(allRatings)

    // Auto-decision: only when completion is still pending
    let autoDecision: 'approved' | 'denied' | null = null
    if (issue.completion.status === 'pending') {
      const pledges = await Pledge.find({ issueId }).select('userId').lean() as any[]
      const pledgerIds = pledges.map((p: any) => p.userId.toString())
      const requiredRaterIds = [...new Set([issue.author.toString(), ...pledgerIds])]
      const raterIds = allRatings.map((r: any) => r.raterId.toString())
      const allHaveRated = requiredRaterIds.every((id) => raterIds.includes(id))

      if (allHaveRated) {
        autoDecision = averageRating !== null && averageRating >= 4 ? 'approved' : 'denied'
      }
    }

    let serializedCompletion: any = null
    let serializedNeed: any = null

    if (autoDecision === 'approved') {
      const claimed = await Issue.findOneAndUpdate(
        { _id: issueId, 'completion.status': 'pending' },
        { $set: { 'completion.status': 'approved', status: 'completed' } }
      )
      if (claimed) {
        try { await settleIssue(issueId) } catch (err) {
          console.error('[commission/rating] settleIssue failed:', err)
        }
      }
    } else if (autoDecision === 'denied') {
      await Issue.findOneAndUpdate(
        { _id: issueId, 'completion.status': 'pending' },
        { $set: { 'completion.status': 'denied' } }
      )
      await Applicant.findByIdAndUpdate(acceptedApplicant._id, { completionDeadline: midnightFollowingDay() })
    }

    if (autoDecision) {
      const updatedIssue = await Issue.findById(issueId)
        .populate({ path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } })
        .populate('image')
        .populate('completion.images')
        .lean() as any

      serializedCompletion = serializeCompletion(updatedIssue.completion, issueId)

      if (autoDecision === 'approved') {
        const [p, a] = await Promise.all([
          Pledge.find({ issueId }).populate(USER_WITH_AVATAR_POPULATE).lean(),
          Applicant.find({ issueId }).populate(APPLICANT_USER_POPULATE).lean(),
        ])
        serializedNeed = serializeIssue({ ...updatedIssue, pledged: p, applicants: a })
      }

      const applicantUserId = acceptedApplicant?.userId?.toString()
      getIssueAudienceIds(issueId, ...(applicantUserId ? [applicantUserId] : [])).then((audience) =>
        emitIssueCompletionReviewed(
          { issueId, completion: serializedCompletion, ...(serializedNeed ? { issue: serializedNeed } : {}) },
          audience
        )
      ).catch((err: any) => console.warn('[socket]', err?.message ?? err))
    }

    return NextResponse.json({
      score,
      averageRating,
      ...(serializedCompletion ? { completion: serializedCompletion } : {}),
      ...(serializedNeed ? { issue: serializedNeed } : {}),
    })
  } catch (err: any) {
    console.error('[commission/rating POST]', err)
    return NextResponse.json({ error: 'Failed to submit rating' }, { status: 500 })
  }
})
