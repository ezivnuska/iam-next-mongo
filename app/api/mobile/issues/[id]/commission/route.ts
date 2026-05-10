// app/api/mobile/issues/[id]/commission/route.ts
// GET  — fetch current completion submission + caller's rating
// POST — accepted applicant submits (or resubmits) completion images

import { isValidObjectId } from '@/app/lib/utils/validation'
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import { serializeCompletion } from '@/app/lib/mobile/serializers'
import { getIssueAudienceIds, emitIssueCompletionSubmitted } from '@/app/lib/socket/emit'
import Commission from '@/app/lib/models/commission'
import Applicant from '@/app/lib/models/applicant'
import ImageModel from '@/app/lib/models/image'

export const GET = withAuth(async (req, token, ctx) => {
  const { id: issueId } = await ctx.params
  if (!isValidObjectId(issueId)) return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })

  try {
    await connectToDatabase()

    const commission = await Commission.findOne({ issueId: issueId }).populate('images').lean()

    let myRating: number | null = null
    let averageRating: number | null = null
    try {
      const Rating = (await import('@/app/lib/models/rating')).default
      const [myDoc, allRatings] = await Promise.all([
        Rating.findOne({ issueId: issueId, raterId: token.id }).lean() as any,
        Rating.find({ issueId: issueId }).lean() as unknown as any[],
      ])
      myRating = myDoc?.score ?? null
      if (allRatings.length > 0) {
        averageRating = Math.round(
          (allRatings.reduce((s: number, r: any) => s + r.score, 0) / allRatings.length) * 10
        ) / 10
      }
    } catch {
      // rating lookup is non-critical
    }

    return NextResponse.json({
      completion: commission ? serializeCompletion(commission) : null,
      myRating,
      averageRating,
    })
  } catch (err) {
    console.error('[mobile/issues/completion GET]', err)
    return NextResponse.json({ error: 'Failed to fetch completion' }, { status: 500 })
  }
})

export const POST = withAuth(async (req, token, ctx) => {
  const { id: issueId } = await ctx.params
  if (!isValidObjectId(issueId)) return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })

  const { imageIds } = await req.json()
  if (!Array.isArray(imageIds) || imageIds.length === 0)
    return NextResponse.json({ error: 'At least one image is required' }, { status: 400 })
  if (imageIds.some((id: any) => !isValidObjectId(id)))
    return NextResponse.json({ error: 'Invalid image ID' }, { status: 400 })

  try {
    await connectToDatabase()
    const applicant = await Applicant.findOne({ issueId: issueId, userId: token.id, status: 'accepted' }).lean()
    if (!applicant)
      return NextResponse.json({ error: 'Only the accepted applicant can submit completion evidence' }, { status: 403 })

    const ownedImages = await ImageModel.find({ _id: { $in: imageIds }, userId: token.id }, '_id').lean()
    if (ownedImages.length !== imageIds.length)
      return NextResponse.json({ error: 'One or more images not found or not owned by you' }, { status: 403 })

    const completion = await Commission.findOneAndUpdate(
      { issueId: issueId },
      { issueId: issueId, applicantId: applicant._id, images: imageIds, reviews: [], status: 'pending' },
      { upsert: true, new: true }
    ).populate('images')

    const serialized = serializeCompletion(completion.toObject())
    getIssueAudienceIds(issueId, token.id).then((audience) =>
      emitIssueCompletionSubmitted({ issueId: issueId, completion: serialized }, audience)
    ).catch((err: any) => console.warn('[socket]', err?.message ?? err))
    return NextResponse.json({ completion: serialized })
  } catch (err) {
    console.error('[mobile/issues/completion POST]', err)
    return NextResponse.json({ error: 'Failed to submit completion' }, { status: 500 })
  }
})
