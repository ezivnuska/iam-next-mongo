// app/api/mobile/issues/[id]/commission/reassign/route.ts
// POST — author passes the contract to the next satisfactory bidder

import { isValidObjectId } from '@/app/lib/utils/validation'
import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import { serializeApplicant } from '@/app/lib/mobile/serializers'
import { getIssueAudienceIds, emitIssueApplicantAccepted, emitIssueApplicantAdded } from '@/app/lib/socket/emit'
import Issue from '@/app/lib/models/issue'
import Applicant from '@/app/lib/models/applicant'
import Pledge from '@/app/lib/models/pledge'
import UserModel from '@/app/lib/models/user'

export const POST = withAuth(async (req, token, ctx) => {
  const { id: issueId } = await ctx.params
  if (!isValidObjectId(issueId)) return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })

  try {
    await connectToDatabase()

    const issue = await Issue.findById(issueId).lean() as any
    if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    if (issue.author.toString() !== token.id)
      return NextResponse.json({ error: 'Only the author can reassign the contract' }, { status: 403 })

    // Release the current accepted applicant back to pending
    const current = await Applicant.findOne({ issueId, status: 'accepted' })
    if (!current) return NextResponse.json({ error: 'No accepted applicant to reassign from' }, { status: 404 })

    current.status = 'pending'
    current.acceptedAt = undefined
    current.completionDeadline = undefined
    await current.save()

    const releasedSerialized = serializeApplicant(current.toObject())

    // Find next satisfactory bidder
    const allPledges = await Pledge.find({ issueId }).lean() as any[]
    const blanketTotal = allPledges.filter((p) => !p.applicantId).reduce((s, p) => s + p.amount, 0)

    const candidates = await Applicant.find({
      issueId,
      status: 'pending',
      bidAmount: { $exists: true, $ne: null },
      _id: { $ne: current._id },
    }).sort({ createdAt: 1 }).lean() as any[]

    const funded = candidates.filter((a) => {
      const directed = allPledges
        .filter((p) => p.applicantId?.toString() === a._id.toString())
        .reduce((s: number, p: any) => s + p.amount, 0)
      return directed + blanketTotal >= a.bidAmount
    })

    if (funded.length === 0) {
      // Broadcast the released applicant update and report no eligible next bidder
      getIssueAudienceIds(issueId).then((audience) =>
        emitIssueApplicantAdded({ issueId, applicant: releasedSerialized }, audience)
      ).catch((err: any) => console.warn('[socket]', err?.message ?? err))
      return NextResponse.json({ applicant: releasedSerialized, nextApplicant: null })
    }

    // Sort by reputation desc, then createdAt asc
    const userIds = funded.map((a: any) => a.userId)
    const users = await UserModel.find({ _id: { $in: userIds } }).lean() as any[]
    const repMap = new Map(users.map((u: any) => [u._id.toString(), u.reputation?.average ?? -1]))
    funded.sort((a: any, b: any) => {
      const diff = (repMap.get(b.userId.toString()) ?? -1) - (repMap.get(a.userId.toString()) ?? -1)
      return diff !== 0 ? diff : new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    })

    const winner = funded[0]
    const deadline = new Date()
    deadline.setDate(deadline.getDate() + 1)
    deadline.setHours(23, 59, 59, 999)

    const nextApplicant = await Applicant.findByIdAndUpdate(
      winner._id,
      { status: 'accepted', acceptedAt: new Date(), completionDeadline: deadline },
      { new: true }
    )

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
