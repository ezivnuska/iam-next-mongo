// app/api/mobile/needs/[id]/completion/route.ts
// GET  — fetch current completion submission
// POST — accepted applicant submits (or resubmits) completion images

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { verifyToken } from '@/app/lib/mobile/verifyToken'
import { serializeCompletion } from '@/app/lib/mobile/serializers'
import Completion from '@/app/lib/models/completion'
import Applicant from '@/app/lib/models/applicant'
import Need from '@/app/lib/models/need'
import '@/app/lib/models/image'

const COMPLETION_DISTANCE_THRESHOLD = 500 // meters

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lon2 - lon1) * Math.PI) / 180
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

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

  const { imageIds, location } = await req.json()
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

    const need = await Need.findById(needId).lean()
    if (need?.location?.latitude != null && need?.location?.longitude != null) {
      if (!location?.latitude || !location?.longitude) {
        return NextResponse.json({ error: 'Location is required to submit completion evidence' }, { status: 400 })
      }
      const distance = haversineDistance(
        location.latitude, location.longitude,
        need.location.latitude, need.location.longitude
      )
      if (distance > COMPLETION_DISTANCE_THRESHOLD) {
        return NextResponse.json(
          { error: `You must be within ${COMPLETION_DISTANCE_THRESHOLD}m of the request location (currently ${Math.round(distance)}m away)` },
          { status: 400 }
        )
      }
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
