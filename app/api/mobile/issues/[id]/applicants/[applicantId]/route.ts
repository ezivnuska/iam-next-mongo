// app/api/mobile/issues/[id]/applicants/[applicantId]/route.ts
// DELETE — author removes a specific pending applicant

import { isValidObjectId } from '@/app/lib/utils/validation'
import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import { getIssueAudienceIds, emitIssueApplicantRemoved } from '@/app/lib/socket/emit'
import Issue from '@/app/lib/models/issue'
import Applicant from '@/app/lib/models/applicant'

export const DELETE = withAuth(async (req, token, ctx) => {
  const { id: issueId, applicantId } = await ctx.params
  if (!isValidObjectId(issueId))   return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })
  if (!isValidObjectId(applicantId)) return NextResponse.json({ error: 'Invalid applicant ID' }, { status: 400 })

  try {
    await connectToDatabase()

    const issue = await Issue.findById(issueId, { author: 1 }).lean() as any
    if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    if (issue.author.toString() !== token.id)
      return NextResponse.json({ error: 'Only the author can deny applicants' }, { status: 403 })

    const applicant = await Applicant.findOneAndDelete({ _id: applicantId, issueId, status: 'pending' })
    if (!applicant) return NextResponse.json({ error: 'Applicant not found or already accepted' }, { status: 404 })

    getIssueAudienceIds(issueId).then((audience) =>
      emitIssueApplicantRemoved({ issueId, applicantId }, audience)
    ).catch((err: any) => console.warn('[socket]', err?.message ?? err))

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[mobile/issues/applicants DELETE]', err)
    return NextResponse.json({ error: 'Failed to deny applicant' }, { status: 500 })
  }
})
