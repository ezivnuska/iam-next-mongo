// app/api/mobile/issues/[id]/complete/route.ts
// PATCH — admin/author fallback to manually trigger settlement if auto-settlement failed.

import { isValidObjectId, USER_WITH_AVATAR_POPULATE } from '@/app/lib/utils/validation'
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import { serializeIssue, serializeCompletion } from '@/app/lib/mobile/serializers'
import { settleIssue } from '@/app/lib/mobile/settleIssue'
import { getIssueAudienceIds, emitIssueCompletionReviewed } from '@/app/lib/socket/emit'
import Issue from '@/app/lib/models/issue'
import Pledge from '@/app/lib/models/pledge'
import Applicant from '@/app/lib/models/applicant'
import Commission from '@/app/lib/models/commission'
import '@/app/lib/models/image'
import '@/app/lib/models/user'

export const PATCH = withAuth(async (req, token, ctx) => {
  const { id } = await ctx.params
  if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })

  try {
    await connectToDatabase()
    const need = await Issue.findById(id)
    if (!need) return NextResponse.json({ error: 'Issue not found' }, { status: 404 })

    const isAuthor = need.author.toString() === token.id
    const isAdmin = token.role === 'admin'
    if (!isAuthor && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (need.status !== 'completed') await settleIssue(id)

    await need.populate([
      { path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } },
      { path: 'image' },
    ])
    const [pledges, applicants, commission, acceptedApplicant] = await Promise.all([
      Pledge.find({ issueId: id }).populate(USER_WITH_AVATAR_POPULATE).lean(),
      Applicant.find({ issueId: id }).lean(),
      Commission.findOne({ issueId: id }).populate('images').lean(),
      Applicant.findOne({ issueId: id, status: 'accepted' }).lean() as any,
    ])

    const serializedIssue = serializeIssue({ ...need.toObject(), pledged: pledges, applicants })

    if (commission) {
      const applicantUserId = acceptedApplicant?.userId?.toString()
      getIssueAudienceIds(id, ...(applicantUserId ? [applicantUserId] : [])).then((audience) =>
        emitIssueCompletionReviewed(
          { issueId: id, completion: serializeCompletion(commission), issue: serializedIssue },
          audience
        )
      ).catch((err: any) => console.warn('[socket]', err?.message ?? err))
    }

    return NextResponse.json({ issue: serializedIssue })
  } catch (err: any) {
    console.error('[mobile/issues/complete PATCH]', err)
    return NextResponse.json({ error: err?.message ?? 'Failed to complete issue' }, { status: 500 })
  }
})
