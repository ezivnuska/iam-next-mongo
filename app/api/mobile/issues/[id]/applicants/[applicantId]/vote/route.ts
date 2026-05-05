// app/api/mobile/issues/[id]/applicants/[applicantId]/vote/route.ts
// POST — cast or update a confirm/deny vote on an applicant (contributors only)

import { isValidObjectId } from '@/app/lib/utils/validation'
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import { serializeApplicant } from '@/app/lib/mobile/serializers'
import { emitIssueApplicantVoted } from '@/app/lib/socket/emit'
import Applicant from '@/app/lib/models/applicant'
import Pledge from '@/app/lib/models/pledge'
import Issue from '@/app/lib/models/issue'

export const POST = withAuth(async (req, token, ctx) => {
  const { id: needId, applicantId } = await ctx.params

  if (!isValidObjectId(needId)) return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })
  if (!isValidObjectId(applicantId)) return NextResponse.json({ error: 'Invalid applicant ID' }, { status: 400 })

  const { vote } = await req.json()
  if (vote !== 'confirm' && vote !== 'deny')
    return NextResponse.json({ error: 'Vote must be "confirm" or "deny"' }, { status: 400 })

  try {
    await connectToDatabase()

    const pledge = await Pledge.findOne({ issueId: needId, userId: token.id }).lean()
    if (!pledge) return NextResponse.json({ error: 'Only contributors can vote' }, { status: 403 })

    const applicant = await Applicant.findOne({ _id: applicantId, issueId: needId })
    if (!applicant) return NextResponse.json({ error: 'Applicant not found' }, { status: 404 })

    const existingIndex = applicant.votes.findIndex((v) => v.userId.toString() === token.id)
    if (existingIndex >= 0) {
      applicant.votes[existingIndex].vote = vote
    } else {
      applicant.votes.push({ userId: token.id as any, vote })
    }

    const pledges = await Pledge.find({ issueId: needId }).lean()
    const contributorIds = [...new Set(pledges.map((p) => p.userId.toString()))]

    const allVoted = contributorIds.every((cId) =>
      applicant.votes.some((v) => v.userId.toString() === cId)
    )
    const anyConfirmed = applicant.votes.some((v) => v.vote === 'confirm')
    applicant.status = allVoted && anyConfirmed ? 'confirmed' : 'pending'

    await applicant.save()

    const serialized = serializeApplicant(applicant.toObject())
    const need = await (Issue as any).findById(needId, { author: 1 }).lean()
    const audience = new Set<string>(contributorIds)
    if (need?.author) audience.add(need.author.toString())
    audience.add(applicant.userId.toString())
    emitIssueApplicantVoted({ issueId: needId, applicant: serialized }, [...audience]).catch(() => {})

    return NextResponse.json({ applicant: serialized })
  } catch (err) {
    console.error('[mobile/issues/applicants/vote POST]', err)
    return NextResponse.json({ error: 'Failed to submit vote' }, { status: 500 })
  }
})
