// app/api/mobile/issues/[id]/commission/route.ts
// GET  — fetch current completion submission
// POST — accepted applicant submits (or resubmits) completion images

import { isValidObjectId } from '@/app/lib/utils/validation'
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import { serializeCompletion } from '@/app/lib/mobile/serializers'
import { getIssueAudienceIds, emitIssueCompletionSubmitted } from '@/app/lib/socket/emit'
import Commission from '@/app/lib/models/commission'
import Applicant from '@/app/lib/models/applicant'
import '@/app/lib/models/image'

export const GET = withAuth(async (req, token, ctx) => {
  const { id: needId } = await ctx.params
  if (!isValidObjectId(needId)) return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })

  try {
    await connectToDatabase()
    const completion = await Commission.findOne({ issueId: needId }).populate('images').lean()
    return NextResponse.json({ completion: completion ? serializeCompletion(completion) : null })
  } catch (err) {
    console.error('[mobile/issues/completion GET]', err)
    return NextResponse.json({ error: 'Failed to fetch completion' }, { status: 500 })
  }
})

export const POST = withAuth(async (req, token, ctx) => {
  const { id: needId } = await ctx.params
  if (!isValidObjectId(needId)) return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })

  const { imageIds } = await req.json()
  if (!Array.isArray(imageIds) || imageIds.length === 0)
    return NextResponse.json({ error: 'At least one image is required' }, { status: 400 })
  if (imageIds.some((id: any) => !isValidObjectId(id)))
    return NextResponse.json({ error: 'Invalid image ID' }, { status: 400 })

  try {
    await connectToDatabase()
    const applicant = await Applicant.findOne({ issueId: needId, userId: token.id, status: 'accepted' }).lean()
    if (!applicant)
      return NextResponse.json({ error: 'Only the accepted applicant can submit completion evidence' }, { status: 403 })

    const completion = await Commission.findOneAndUpdate(
      { issueId: needId },
      { issueId: needId, applicantId: applicant._id, images: imageIds, reviews: [], status: 'pending' },
      { upsert: true, new: true }
    ).populate('images')

    const serialized = serializeCompletion(completion.toObject())
    getIssueAudienceIds(needId).then((audience) =>
      emitIssueCompletionSubmitted({ issueId: needId, completion: serialized }, audience)
    ).catch(() => {})
    return NextResponse.json({ completion: serialized })
  } catch (err) {
    console.error('[mobile/issues/completion POST]', err)
    return NextResponse.json({ error: 'Failed to submit completion' }, { status: 500 })
  }
})
