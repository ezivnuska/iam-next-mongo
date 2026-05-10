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
  const { id: issueId, applicantId } = await ctx.params

  if (!isValidObjectId(issueId)) return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })
  if (!isValidObjectId(applicantId)) return NextResponse.json({ error: 'Invalid applicant ID' }, { status: 400 })

  const { vote } = await req.json()
  if (vote !== 'confirm' && vote !== 'deny')
    return NextResponse.json({ error: 'Vote must be "confirm" or "deny"' }, { status: 400 })

  try {
    await connectToDatabase()

    const pledge = await Pledge.findOne({ issueId: issueId, userId: token.id }).lean()
    if (!pledge) return NextResponse.json({ error: 'Only contributors can vote' }, { status: 403 })

    const applicant = await Applicant.findOne({ _id: applicantId, issueId: issueId })
    if (!applicant) return NextResponse.json({ error: 'Applicant not found' }, { status: 404 })
    if (applicant.userId.toString() === token.id)
      return NextResponse.json({ error: 'Applicants cannot vote on their own application' }, { status: 403 })

    const existingIndex = applicant.votes.findIndex((v) => v.userId.toString() === token.id)
    if (existingIndex >= 0) {
      applicant.votes[existingIndex].vote = vote
    } else {
      applicant.votes.push({ userId: token.id as any, vote })
    }

    const pledges = await Pledge.find({ issueId: issueId }).lean()
    const contributorIds = [...new Set(pledges.map((p) => p.userId.toString()))]

    const allVoted = contributorIds.every((cId) =>
      applicant.votes.some((v) => v.userId.toString() === cId)
    )
    const anyConfirmed = applicant.votes.some((v) => v.vote === 'confirm')
    applicant.status = allVoted && anyConfirmed ? 'confirmed' : 'pending'

    await applicant.save()

    const serialized = serializeApplicant(applicant.toObject())
    const issue = await Issue.findById(issueId, { author: 1 }).lean() as any
    const audience = new Set<string>(contributorIds)
    if (issue?.author) audience.add(issue.author.toString())
    audience.add(applicant.userId.toString())
    emitIssueApplicantVoted({ issueId: issueId, applicant: serialized }, [...audience]).catch((err: any) => console.warn('[socket]', err?.message ?? err))

    return NextResponse.json({ applicant: serialized })
  } catch (err) {
    console.error('[mobile/issues/applicants/vote POST]', err)
    return NextResponse.json({ error: 'Failed to submit vote' }, { status: 500 })
  }
})
