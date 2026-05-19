// app/api/mobile/issues/[id]/commission/route.ts
// GET  — fetch current completion submission + caller's rating
// POST — accepted applicant submits (or resubmits) completion images

import { isValidObjectId } from '@/app/lib/utils/validation'
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import { serializeCompletion } from '@/app/lib/mobile/serializers'
import { calculateAverageRating } from '@/app/lib/utils/ratingUtils'
import { getIssueAudienceIds, emitIssueCompletionSubmitted } from '@/app/lib/socket/emit'
import Issue from '@/app/lib/models/issue'
import Applicant from '@/app/lib/models/applicant'
import ImageModel from '@/app/lib/models/image'

export const GET = withAuth(async (req, token, ctx) => {
  const { id: issueId } = await ctx.params
  if (!isValidObjectId(issueId)) return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })

  try {
    await connectToDatabase()

    const issue = await Issue.findById(issueId).populate('completion.images').lean() as any
    const completion = issue?.completion ?? null

    let myRating: number | null = null
    let averageRating: number | null = null
    let ratingCount = 0
    const commissionId = completion?._id ?? null
    if (commissionId) {
      try {
        const Rating = (await import('@/app/lib/models/rating')).default
        const [myDoc, allRatings] = await Promise.all([
          Rating.findOne({ commissionId, raterId: token.id }).lean() as any,
          Rating.find({ commissionId }).lean() as unknown as any[],
        ])
        myRating = myDoc?.score ?? null
        averageRating = calculateAverageRating(allRatings)
        ratingCount = allRatings.length
      } catch {
        // rating lookup is non-critical
      }
    }

    return NextResponse.json({
      completion: completion ? serializeCompletion(completion, issueId) : null,
      myRating,
      averageRating,
      ratingCount,
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
    const applicant = await Applicant.findOne({ issueId, userId: token.id, status: 'accepted' }).lean()
    if (!applicant)
      return NextResponse.json({ error: 'Only the accepted applicant can submit completion evidence' }, { status: 403 })

    const ownedImages = await ImageModel.find({ _id: { $in: imageIds }, userId: token.id }, '_id').lean()
    if (ownedImages.length !== imageIds.length)
      return NextResponse.json({ error: 'One or more images not found or not owned by you' }, { status: 403 })

    const issue = await Issue.findById(issueId)
    if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 })

    const autoApproveAt = new Date(Date.now() + 48 * 60 * 60 * 1000)

    issue.completion = {
      applicantId: (applicant as any)._id,
      images: imageIds,
      reviews: [],
      status: 'pending',
      autoApproveAt,
    } as any
    await issue.save()
    await issue.populate('completion.images')

    const serialized = serializeCompletion((issue.completion as any).toObject(), issueId)
    getIssueAudienceIds(issueId, token.id).then((audience) =>
      emitIssueCompletionSubmitted({ issueId, completion: serialized }, audience)
    ).catch((err: any) => console.warn('[socket]', err?.message ?? err))
    return NextResponse.json({ completion: serialized })
  } catch (err) {
    console.error('[mobile/issues/completion POST]', err)
    return NextResponse.json({ error: 'Failed to submit completion' }, { status: 500 })
  }
})
