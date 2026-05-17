// app/api/mobile/issues/[id]/commission/reassign/route.ts
// POST — author passes the contract to the next satisfactory bidder

import { isValidObjectId } from '@/app/lib/utils/validation'
import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import { serializeApplicant } from '@/app/lib/mobile/serializers'
import { getIssueAudienceIds, emitIssueApplicantAccepted, emitIssueApplicantAdded } from '@/app/lib/socket/emit'
import { APPLICANT_USER_POPULATE } from '@/app/lib/utils/validation'
import { midnightFollowingDay } from '@/app/lib/mobile/deadlines'
import { selectFundedWinner } from '@/app/lib/mobile/fundingUtils'
import Issue from '@/app/lib/models/issue'
import Applicant from '@/app/lib/models/applicant'
import Pledge from '@/app/lib/models/pledge'

export const POST = withAuth(async (req, token, ctx) => {
  const { id: issueId } = await ctx.params
  if (!isValidObjectId(issueId)) return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })

  try {
    await connectToDatabase()

    const issue = await Issue.findById(issueId).lean() as any
    if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    if (issue.author.toString() !== token.id)
      return NextResponse.json({ error: 'Only the author can reassign the contract' }, { status: 403 })

    const current = await Applicant.findOne({ issueId, status: 'accepted' }).populate(APPLICANT_USER_POPULATE)
    if (!current) return NextResponse.json({ error: 'No accepted applicant to reassign from' }, { status: 404 })

    current.status = 'pending'
    current.acceptedAt = undefined
    current.completionDeadline = undefined
    await current.save()

    const releasedSerialized = serializeApplicant(current.toObject())

    const [allPledges, candidates] = await Promise.all([
      Pledge.find({ issueId }).lean() as Promise<any[]>,
      Applicant.find({ issueId, status: 'pending', bidAmount: { $exists: true, $ne: null }, _id: { $ne: current._id } })
        .sort({ createdAt: 1 }).lean() as Promise<any[]>,
    ])

    const winner = await selectFundedWinner(candidates, allPledges)

    if (!winner) {
      getIssueAudienceIds(issueId).then((audience) =>
        emitIssueApplicantAdded({ issueId, applicant: releasedSerialized }, audience)
      ).catch((err: any) => console.warn('[socket]', err?.message ?? err))
      return NextResponse.json({ applicant: releasedSerialized, nextApplicant: null })
    }

    const nextApplicant = await Applicant.findByIdAndUpdate(
      winner._id,
      { status: 'accepted', acceptedAt: new Date(), completionDeadline: midnightFollowingDay() },
      { new: true }
    ).populate(APPLICANT_USER_POPULATE)

    const nextSerialized = serializeApplicant(nextApplicant!.toObject())

    getIssueAudienceIds(issueId, winner.userId.toString()).then((audience) => {
      emitIssueApplicantAdded({ issueId, applicant: releasedSerialized }, audience)
      emitIssueApplicantAccepted({ issueId, applicant: nextSerialized }, audience)
    }).catch((err: any) => console.warn('[socket]', err?.message ?? err))

    return NextResponse.json({ applicant: releasedSerialized, nextApplicant: nextSerialized })
  } catch (err) {
    console.error('[commission/reassign POST]', err)
    return NextResponse.json({ error: 'Failed to reassign contract' }, { status: 500 })
  }
})
