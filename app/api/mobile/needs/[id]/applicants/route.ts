// app/api/mobile/needs/[id]/applicants/route.ts
// POST   — apply to a need
// DELETE — withdraw application

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { verifyToken } from '@/app/lib/mobile/verifyToken'
import { serializeApplicant } from '@/app/lib/mobile/serializers'
import Applicant from '@/app/lib/models/applicant'
import Need from '@/app/lib/models/need'

export async function POST(
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

    const need = await Need.findById(id).lean()
    if (!need) {
      return NextResponse.json({ error: 'Need not found' }, { status: 404 })
    }

    const applicant = await Applicant.create({
      userId: tokenPayload.id,
      needId: id,
    })

    return NextResponse.json({ applicant: serializeApplicant(applicant.toObject()) }, { status: 201 })
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json({ error: 'Already applied to this need' }, { status: 409 })
    }
    console.error('[mobile/needs/applicants POST]', err)
    return NextResponse.json({ error: 'Failed to apply' }, { status: 500 })
  }
}

export async function DELETE(
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

    const result = await Applicant.findOneAndDelete({ userId: tokenPayload.id, needId: id })
    if (!result) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[mobile/needs/applicants DELETE]', err)
    return NextResponse.json({ error: 'Failed to withdraw application' }, { status: 500 })
  }
}
