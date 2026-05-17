// app/api/mobile/issues/[id]/commission/review/route.ts
// POST — contributor approves or denies the completion submission

import { isValidObjectId, USER_WITH_AVATAR_POPULATE } from '@/app/lib/utils/validation'
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import { serializeCompletion, serializeIssue } from '@/app/lib/mobile/serializers'
import { settleIssue } from '@/app/lib/mobile/settleIssue'
import { getIssueAudienceIds, emitIssueCompletionReviewed } from '@/app/lib/socket/emit'
import Applicant from '@/app/lib/models/applicant'
import Pledge from '@/app/lib/models/pledge'
import { midnightFollowingDay } from '@/app/lib/mobile/deadlines'
import Issue from '@/app/lib/models/issue'
import '@/app/lib/models/image'
import '@/app/lib/models/user'

export const POST = withAuth(async (req, token, ctx) => {
  const { id: issueId } = await ctx.params
  if (!isValidObjectId(issueId)) return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })

  const { vote } = await req.json()
  if (vote !== 'approve' && vote !== 'deny')
    return NextResponse.json({ error: 'Vote must be "approve" or "deny"' }, { status: 400 })

  try {
    await connectToDatabase()

    const [pledge, issue] = await Promise.all([
      Pledge.findOne({ issueId, userId: token.id }).lean(),
      Issue.findById(issueId).lean() as any,
    ])
    const isAuthorReviewing = issue?.author?.toString() === token.id
    if (!pledge && !isAuthorReviewing)
      return NextResponse.json({ error: 'Only contributors or the author can review completion' }, { status: 403 })

    if (!issue?.completion)
      return NextResponse.json({ error: 'No completion submission found' }, { status: 404 })
    if (issue.completion.status !== 'pending')
      return NextResponse.json({ error: 'Submission is no longer pending' }, { status: 400 })

    // Build updated reviews in memory
    const reviews = issue.completion.reviews.map((r: any) => ({ userId: r.userId, vote: r.vote }))
    const existingIndex = reviews.findIndex((r: any) => r.userId.toString() === token.id)
    if (existingIndex >= 0) {
      reviews[existingIndex].vote = vote
    } else {
      reviews.push({ userId: token.id, vote })
    }

    const applicant = await Applicant.findOne({ issueId, status: 'accepted' }).lean()
    const authorId = issue?.author?.toString()

    const authorApproved = !!authorId && reviews.some((r: any) => r.userId.toString() === authorId && r.vote === 'approve')
    const anyDenied      = !!authorId && reviews.some((r: any) => r.userId.toString() === authorId && r.vote === 'deny')
    const newStatus = authorApproved ? 'approved' : anyDenied ? 'denied' : 'pending'

    if (newStatus === 'approved') {
      // Atomically claim the pending→approved transition on the issue document
      const claimed = await Issue.findOneAndUpdate(
        { _id: issueId, 'completion.status': 'pending' },
        { $set: { 'completion.status': 'approved', 'completion.reviews': reviews, status: 'completed' } }
      )
      if (!claimed) {
        // Another concurrent request already claimed the transition — return current state
        const current = await Issue.findById(issueId).populate('completion.images').lean() as any
        return NextResponse.json({ completion: serializeCompletion(current.completion, issueId) })
      }

      try { await settleIssue(issueId) } catch (err) {
        console.error('[commission/review] settleIssue failed:', err)
      }
    } else {
      await Issue.findOneAndUpdate(
        { _id: issueId },
        { $set: { 'completion.status': newStatus, 'completion.reviews': reviews } }
      )
      if (newStatus === 'denied' && applicant) {
        await Applicant.findByIdAndUpdate((applicant as any)._id, { completionDeadline: midnightFollowingDay() })
      }
    }

    const updatedIssue = await Issue.findById(issueId)
      .populate({ path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } })
      .populate('image')
      .populate('completion.images')
      .lean() as any

    const serializedCompletion = serializeCompletion(updatedIssue.completion, issueId)

    let serializedNeed = null
    if (newStatus === 'approved' && updatedIssue) {
      const [p, a] = await Promise.all([
        Pledge.find({ issueId }).populate(USER_WITH_AVATAR_POPULATE).lean(),
        Applicant.find({ issueId }).lean(),
      ])
      serializedNeed = serializeIssue({ ...updatedIssue, pledged: p, applicants: a })
    }

    const applicantUserId = (applicant as any)?.userId?.toString()
    getIssueAudienceIds(issueId, ...(applicantUserId ? [applicantUserId] : [])).then((audience) =>
      emitIssueCompletionReviewed(
        { issueId, completion: serializedCompletion, ...(serializedNeed ? { issue: serializedNeed } : {}) },
        audience
      )
    ).catch((err: any) => console.warn('[socket]', err?.message ?? err))

    return NextResponse.json({
      completion: serializedCompletion,
      ...(serializedNeed ? { issue: serializedNeed } : {}),
    })
  } catch (err) {
    console.error('[mobile/issues/completion/review POST]', err)
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
  }
})
