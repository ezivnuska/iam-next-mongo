// app/api/mobile/needs/[id]/completion/route.ts
// GET  — fetch current completion submission
// POST — accepted applicant submits (or resubmits) completion images

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { verifyToken } from '@/app/lib/mobile/verifyToken'
import { serializeCompletion } from '@/app/lib/mobile/serializers'
import Completion from '@/app/lib/models/completion'
import Applicant from '@/app/lib/models/applicant'
import '@/app/lib/models/image'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tokenPayload = await verifyToken(req)
  if (!tokenPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: needId } = await params

  if (!/^[a-f\d]{24}$/i.test(needId)) {
    return NextResponse.json({ error: 'Invalid need ID' }, { status: 400 })
  }

  try {
    await connectToDatabase()
    const completion = await Completion.findOne({ needId }).populate('images').lean()
    return NextResponse.json({ completion: completion ? serializeCompletion(completion) : null })
  } catch (err) {
    console.error('[mobile/needs/completion GET]', err)
    return NextResponse.json({ error: 'Failed to fetch completion' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tokenPayload = await verifyToken(req)
  if (!tokenPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: needId } = await params

  if (!/^[a-f\d]{24}$/i.test(needId)) {
    return NextResponse.json({ error: 'Invalid need ID' }, { status: 400 })
  }

  const { imageIds } = await req.json()
  if (!Array.isArray(imageIds) || imageIds.length === 0) {
    return NextResponse.json({ error: 'At least one image is required' }, { status: 400 })
  }
  if (imageIds.some((id: any) => !/^[a-f\d]{24}$/i.test(id))) {
    return NextResponse.json({ error: 'Invalid image ID' }, { status: 400 })
  }

  try {
    await connectToDatabase()

    const applicant = await Applicant.findOne({ needId, userId: tokenPayload.id, status: 'accepted' }).lean()
    if (!applicant) {
      return NextResponse.json({ error: 'Only the accepted applicant can submit completion evidence' }, { status: 403 })
    }

    // Upsert — replace any prior submission, reset reviews and status
    const completion = await Completion.findOneAndUpdate(
      { needId },
      {
        needId,
        applicantId: applicant._id,
        images: imageIds,
        reviews: [],
        status: 'pending',
      },
      { upsert: true, new: true }
    ).populate('images')

    return NextResponse.json({ completion: serializeCompletion(completion.toObject()) })
  } catch (err) {
    console.error('[mobile/needs/completion POST]', err)
    return NextResponse.json({ error: 'Failed to submit completion' }, { status: 500 })
  }
}
