// app/api/mobile/issues/[id]/commission/review/route.ts
// POST — contributor approves or denies the completion submission

import { isValidObjectId, USER_WITH_AVATAR_POPULATE } from '@/app/lib/utils/validation'
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import { serializeCompletion, serializeIssue } from '@/app/lib/mobile/serializers'
import { settleIssue } from '@/app/lib/mobile/settleIssue'
import { getIssueAudienceIds, emitIssueCompletionReviewed } from '@/app/lib/socket/emit'
import Commission from '@/app/lib/models/commission'
import Applicant from '@/app/lib/models/applicant'
import Pledge from '@/app/lib/models/pledge'
import Issue from '@/app/lib/models/issue'
import '@/app/lib/models/image'
import '@/app/lib/models/user'

export const POST = withAuth(async (req, token, ctx) => {
  const { id: needId } = await ctx.params
  if (!isValidObjectId(needId)) return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })

  const { vote } = await req.json()
  if (vote !== 'approve' && vote !== 'deny')
    return NextResponse.json({ error: 'Vote must be "approve" or "deny"' }, { status: 400 })

  try {
    await connectToDatabase()

    const pledge = await Pledge.findOne({ issueId: needId, userId: token.id }).lean()
    if (!pledge) return NextResponse.json({ error: 'Only contributors can review completion' }, { status: 403 })

    const completion = await Commission.findOne({ issueId: needId })
    if (!completion) return NextResponse.json({ error: 'No completion submission found' }, { status: 404 })
    if (completion.status !== 'pending')
      return NextResponse.json({ error: 'Submission is no longer pending' }, { status: 400 })

    const existingIndex = completion.reviews.findIndex((r) => r.userId.toString() === token.id)
    if (existingIndex >= 0) {
      completion.reviews[existingIndex].vote = vote
    } else {
      completion.reviews.push({ userId: token.id as any, vote })
    }

    const applicant = await Applicant.findOne({ issueId: needId, status: 'accepted' }).lean()
    const confirmingIds = applicant
      ? [...new Set(applicant.votes.filter((v: any) => v.vote === 'confirm').map((v: any) => v.userId.toString()))]
      : []

    const pledges = await Pledge.find({ issueId: needId }).lean()
    const allContributorIds = [...new Set(pledges.map((p) => p.userId.toString()))]
    const reviewerIds = confirmingIds.length > 0
      ? allContributorIds.filter((id) => confirmingIds.includes(id))
      : allContributorIds

    const anyDenied = completion.reviews.some(
      (r) => reviewerIds.includes(r.userId.toString()) && r.vote === 'deny'
    )
    const allApproved = reviewerIds.every((rId) =>
      completion.reviews.some((r) => r.userId.toString() === rId && r.vote === 'approve')
    )

    const newStatus = anyDenied ? 'denied' : allApproved ? 'approved' : 'pending'
    completion.status = newStatus
    await completion.save()
    await completion.populate('images')

    let serializedNeed = null
    if (newStatus === 'approved') {
      try { await settleIssue(needId) } catch (err) {
        console.error('[commission/review] settleIssue failed:', err)
      }
      const need = await Issue.findById(needId)
        .populate({ path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } })
        .populate('image')
        .lean()
      if (need) {
        const [p, a] = await Promise.all([
          Pledge.find({ issueId: needId }).populate(USER_WITH_AVATAR_POPULATE).lean(),
          Applicant.find({ issueId: needId }).lean(),
        ])
        serializedNeed = serializeIssue({ ...need, pledged: p, applicants: a })
      }
    }

    const serializedCompletion = serializeCompletion(completion.toObject())
    const applicantUserId = applicant?.userId?.toString()
    getIssueAudienceIds(needId, ...(applicantUserId ? [applicantUserId] : [])).then((audience) =>
      emitIssueCompletionReviewed(
        { issueId: needId, completion: serializedCompletion, ...(serializedNeed ? { issue: serializedNeed } : {}) },
        audience
      )
    ).catch(() => {})

    return NextResponse.json({
      completion: serializedCompletion,
      ...(serializedNeed ? { issue: serializedNeed } : {}),
    })
  } catch (err) {
    console.error('[mobile/issues/completion/review POST]', err)
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
  }
})
