// app/api/mobile/needs/[id]/complete/route.ts
// PATCH — mark a need as completed (author only, requires an accepted applicant)

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { verifyToken } from '@/app/lib/mobile/verifyToken'
import { serializeNeed } from '@/app/lib/mobile/serializers'
import Need from '@/app/lib/models/need'
import Pledge from '@/app/lib/models/pledge'
import Applicant from '@/app/lib/models/applicant'
import '@/app/lib/models/image'
import '@/app/lib/models/user'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tokenPayload = await verifyToken(req)
  if (!tokenPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  if (!/^[a-f\d]{24}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid need ID' }, { status: 400 })
  }

  try {
    await connectToDatabase()

    const need = await Need.findById(id)
    if (!need) {
      return NextResponse.json({ error: 'Need not found' }, { status: 404 })
    }

    if (need.author.toString() !== tokenPayload.id) {
      return NextResponse.json({ error: 'Only the author can mark a need complete' }, { status: 403 })
    }

    const acceptedApplicant = await Applicant.findOne({ needId: id, status: 'accepted' }).lean()
    if (!acceptedApplicant) {
      return NextResponse.json({ error: 'No accepted applicant yet' }, { status: 400 })
    }

    need.status = 'completed'
    await need.save()

    await need.populate([
      { path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } },
      { path: 'image' },
    ])

    const [pledges, applicants] = await Promise.all([
      Pledge.find({ needId: id }).populate({ path: 'userId', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } }).lean(),
      Applicant.find({ needId: id }).lean(),
    ])

    return NextResponse.json({ need: serializeNeed({ ...need.toObject(), pledged: pledges, applicants }) })
  } catch (err) {
    console.error('[mobile/needs/complete PATCH]', err)
    return NextResponse.json({ error: 'Failed to mark need complete' }, { status: 500 })
  }
}
