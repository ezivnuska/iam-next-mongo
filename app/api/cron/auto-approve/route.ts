// app/api/cron/auto-approve/route.ts
// GET — auto-approve completion submissions whose review window has elapsed.
// Call this on a schedule (e.g. every 10 minutes via cron or PM2).
// Protect with CRON_SECRET env var to prevent unauthenticated calls.

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { serializeCompletion, serializeIssue } from '@/app/lib/mobile/serializers'
import { settleIssue } from '@/app/lib/mobile/settleIssue'
import { getIssueAudienceIds, emitIssueCompletionReviewed } from '@/app/lib/socket/emit'
import { USER_WITH_AVATAR_POPULATE } from '@/app/lib/utils/validation'
import Issue from '@/app/lib/models/issue'
import Applicant from '@/app/lib/models/applicant'
import Pledge from '@/app/lib/models/pledge'
import '@/app/lib/models/image'
import '@/app/lib/models/user'

export const GET = async (req: NextRequest) => {
  const secret = req.headers.get('x-cron-secret')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET)
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await connectToDatabase()

    const now = new Date()
    const expired = await Issue.find({
      'completion.status': 'pending',
      'completion.autoApproveAt': { $lte: now },
    }).lean() as any[]

    if (expired.length === 0) return NextResponse.json({ approved: 0 })

    let approved = 0

    await Promise.allSettled(expired.map(async (issue) => {
      const issueId = issue._id.toString()
      try {
        const claimed = await Issue.findOneAndUpdate(
          { _id: issueId, 'completion.status': 'pending' },
          { $set: { 'completion.status': 'approved', status: 'completed' } }
        )
        if (!claimed) return

        try { await settleIssue(issueId) } catch (err) {
          console.error('[cron/auto-approve] settleIssue failed:', issueId, err)
        }

        const updatedIssue = await Issue.findById(issueId)
          .populate({ path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } })
          .populate('image')
          .populate('completion.images')
          .lean() as any

        const [pledges, applicants] = await Promise.all([
          Pledge.find({ issueId }).populate(USER_WITH_AVATAR_POPULATE).lean(),
          Applicant.find({ issueId }).lean(),
        ])

        const serializedCompletion = serializeCompletion(updatedIssue.completion, issueId)
        const serializedIssue = serializeIssue({ ...updatedIssue, pledged: pledges, applicants })

        const applicant = await Applicant.findOne({ issueId, status: 'accepted' }).lean() as any
        const applicantUserId = applicant?.userId?.toString()

        getIssueAudienceIds(issueId, ...(applicantUserId ? [applicantUserId] : [])).then((audience) =>
          emitIssueCompletionReviewed({ issueId, completion: serializedCompletion, issue: serializedIssue }, audience)
        ).catch((err: any) => console.warn('[socket]', err?.message ?? err))

        approved++
      } catch (err) {
        console.error('[cron/auto-approve] failed for issue', issueId, err)
      }
    }))

    return NextResponse.json({ approved })
  } catch (err) {
    console.error('[cron/auto-approve]', err)
    return NextResponse.json({ error: 'Auto-approve job failed' }, { status: 500 })
  }
}
