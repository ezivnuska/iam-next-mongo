// app/api/mobile/needs/[id]/applicants/[applicantId]/vote/route.ts
// POST — cast or update a confirm/deny vote on an applicant (contributors only)

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { verifyToken } from '@/app/lib/mobile/verifyToken'
import { serializeApplicant } from '@/app/lib/mobile/serializers'
import Applicant from '@/app/lib/models/applicant'
import Pledge from '@/app/lib/models/pledge'

export async function POST(
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

  const { vote } = await req.json()
  if (vote !== 'confirm' && vote !== 'deny') {
    return NextResponse.json({ error: 'Vote must be "confirm" or "deny"' }, { status: 400 })
  }

  try {
    await connectToDatabase()

    // Voter must be a contributor
    const pledge = await Pledge.findOne({ needId, userId: tokenPayload.id }).lean()
    if (!pledge) {
      return NextResponse.json({ error: 'Only contributors can vote' }, { status: 403 })
    }

    const applicant = await Applicant.findOne({ _id: applicantId, needId })
    if (!applicant) {
      return NextResponse.json({ error: 'Applicant not found' }, { status: 404 })
    }

    // Upsert this contributor's vote
    const existingIndex = applicant.votes.findIndex(
      (v) => v.userId.toString() === tokenPayload.id
    )
    if (existingIndex >= 0) {
      applicant.votes[existingIndex].vote = vote
    } else {
      applicant.votes.push({ userId: tokenPayload.id as any, vote })
    }

    // Recalculate status from all current votes
    const pledges = await Pledge.find({ needId }).lean()
    const contributorIds = [...new Set(pledges.map((p) => p.userId.toString()))]

    const hasDeny = applicant.votes.some((v) => v.vote === 'deny')
    const allConfirmed = contributorIds.every((cId) =>
      applicant.votes.some((v) => v.userId.toString() === cId && v.vote === 'confirm')
    )

    applicant.status = hasDeny ? 'denied' : allConfirmed ? 'confirmed' : 'pending'

    await applicant.save()

    return NextResponse.json({ applicant: serializeApplicant(applicant.toObject()) })
  } catch (err) {
    console.error('[mobile/needs/applicants/vote POST]', err)
    return NextResponse.json({ error: 'Failed to submit vote' }, { status: 500 })
  }
}
