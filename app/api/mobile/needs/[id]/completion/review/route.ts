// app/api/mobile/needs/[id]/completion/review/route.ts
// POST — confirming contributor approves or denies the completion submission

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { verifyToken } from '@/app/lib/mobile/verifyToken'
import { serializeCompletion, serializeNeed } from '@/app/lib/mobile/serializers'
import { settleNeed } from '@/app/lib/mobile/settleNeed'
import Completion from '@/app/lib/models/completion'
import Applicant from '@/app/lib/models/applicant'
import Pledge from '@/app/lib/models/pledge'
import Need from '@/app/lib/models/need'
import '@/app/lib/models/image'
import '@/app/lib/models/user'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tokenPayload = await verifyToken(req)
  if (!tokenPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: needId } = await params

  if (!/^[a-f\d]{24}$/i.test(needId)) {
    return NextResponse.json({ error: 'Invalid need ID' }, { status: 400 })
  }

  const { vote } = await req.json()
  if (vote !== 'approve' && vote !== 'deny') {
    return NextResponse.json({ error: 'Vote must be "approve" or "deny"' }, { status: 400 })
  }

  try {
    await connectToDatabase()

    const pledge = await Pledge.findOne({ needId, userId: tokenPayload.id }).lean()
    if (!pledge) {
      return NextResponse.json({ error: 'Only contributors can review completion' }, { status: 403 })
    }

    const completion = await Completion.findOne({ needId })
    if (!completion) {
      return NextResponse.json({ error: 'No completion submission found' }, { status: 404 })
    }

    if (completion.status !== 'pending') {
      return NextResponse.json({ error: 'Submission is no longer pending' }, { status: 400 })
    }

    // Upsert this contributor's review
    const existingIndex = completion.reviews.findIndex(
      (r) => r.userId.toString() === tokenPayload.id
    )
    if (existingIndex >= 0) {
      completion.reviews[existingIndex].vote = vote
    } else {
      completion.reviews.push({ userId: tokenPayload.id as any, vote })
    }

    // Only contributors who voted confirm on the accepted applicant must approve
    const applicant = await Applicant.findOne({ needId, status: 'accepted' }).lean()
    const confirmingIds = applicant
      ? [...new Set(
          applicant.votes
            .filter((v: any) => v.vote === 'confirm')
            .map((v: any) => v.userId.toString())
        )]
      : []

    const pledges = await Pledge.find({ needId }).lean()
    const allContributorIds = [...new Set(pledges.map((p) => p.userId.toString()))]

    // Reviewers are confirming contributors; fall back to all contributors if none
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
      try {
        await settleNeed(needId)
      } catch (err) {
        console.error('[completion/review] settleNeed failed:', err)
      }

      const need = await Need.findById(needId)
        .populate({ path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } })
        .populate('image')
        .lean()

      if (need) {
        const [pledges, applicants] = await Promise.all([
          Pledge.find({ needId }).populate({ path: 'userId', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } }).lean(),
          Applicant.find({ needId }).lean(),
        ])
        serializedNeed = serializeNeed({ ...need, pledged: pledges, applicants })
      }
    }

    return NextResponse.json({
      completion: serializeCompletion(completion.toObject()),
      ...(serializedNeed ? { need: serializedNeed } : {}),
    })
  } catch (err) {
    console.error('[mobile/needs/completion/review POST]', err)
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 })
  }
}
