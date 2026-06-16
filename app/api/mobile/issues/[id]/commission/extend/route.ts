// app/api/mobile/issues/[id]/commission/extend/route.ts
// PATCH — author extends the accepted applicant's completion deadline by 24 hours

import { isValidObjectId } from '@/app/lib/utils/validation'
import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import { serializeApplicant } from '@/app/lib/mobile/serializers'
import { APPLICANT_USER_POPULATE } from '@/app/lib/utils/validation'
import { midnightFollowingDay } from '@/app/lib/mobile/deadlines'
import { getIssueAudienceIds, emitIssueApplicantAccepted } from '@/app/lib/socket/emit'
import Issue from '@/app/lib/models/issue'
import Applicant from '@/app/lib/models/applicant'

export const PATCH = withAuth(async (req, token, ctx) => {
  const { id: issueId } = await ctx.params
  if (!isValidObjectId(issueId)) return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })

  try {
    await connectToDatabase()

    const issue = await Issue.findById(issueId).lean() as any
    if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    if (issue.author.toString() !== token.id)
      return NextResponse.json({ error: 'Only the author can extend the deadline' }, { status: 403 })

    const applicant = await Applicant.findOne({ issueId, status: 'accepted' }).populate(APPLICANT_USER_POPULATE)
    if (!applicant) return NextResponse.json({ error: 'No accepted applicant found' }, { status: 404 })

    applicant.completionDeadline = midnightFollowingDay()
    await applicant.save()

    const serialized = serializeApplicant(applicant.toObject())
    getIssueAudienceIds(issueId, applicant.userId.toString()).then((audience) =>
      emitIssueApplicantAccepted({ issueId, applicant: serialized }, audience)
    ).catch((err: any) => console.warn('[socket]', err?.message ?? err))

    return NextResponse.json({ applicant: serialized })
  } catch (err) {
    console.error('[commission/extend PATCH]', err)
    return NextResponse.json({ error: 'Failed to extend deadline' }, { status: 500 })
  }
})
