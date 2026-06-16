// app/api/mobile/issues/[id]/images/route.ts
// POST — append an image to an existing issue (author only)

import { isValidObjectId, USER_WITH_AVATAR_POPULATE, APPLICANT_USER_POPULATE } from '@/app/lib/utils/validation'
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import { serializeIssue } from '@/app/lib/mobile/serializers'
import Issue from '@/app/lib/models/issue'
import Pledge from '@/app/lib/models/pledge'
import Applicant from '@/app/lib/models/applicant'
import '@/app/lib/models/user'
import '@/app/lib/models/image'

export const POST = withAuth(async (req, token, ctx) => {
  const { id } = await ctx.params
  if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })

  try {
    const { imageId } = await req.json()

    if (!imageId || !isValidObjectId(imageId)) {
      return NextResponse.json({ error: 'Invalid image ID' }, { status: 400 })
    }

    await connectToDatabase()

    const issue = await Issue.findById(id)
    if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    if (issue.author.toString() !== token.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    ;(issue as any).images.push(imageId)
    await issue.save()

    await issue.populate([
      { path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } },
      { path: 'images' },
      { path: 'image' },
    ])

    const [pledges, applicants] = await Promise.all([
      Pledge.find({ issueId: id }).populate(USER_WITH_AVATAR_POPULATE).lean(),
      Applicant.find({ issueId: id }).populate(APPLICANT_USER_POPULATE).lean(),
    ])

    return NextResponse.json({
      issue: serializeIssue({ ...issue.toObject(), pledged: pledges, applicants }),
    })
  } catch (err) {
    console.error('[mobile/issues/[id]/images POST]', err)
    return NextResponse.json({ error: 'Failed to add image' }, { status: 500 })
  }
})
