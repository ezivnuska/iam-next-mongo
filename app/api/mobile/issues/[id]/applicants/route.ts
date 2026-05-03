// app/api/mobile/needs/[id]/applicants/route.ts
// POST   — apply to a need
// DELETE — withdraw application

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { verifyToken } from '@/app/lib/mobile/verifyToken'
import { serializeApplicant } from '@/app/lib/mobile/serializers'
import { getIssueAudienceIds, emitIssueApplicantAdded, emitIssueApplicantRemoved } from '@/app/lib/socket/emit'
import Applicant from '@/app/lib/models/applicant'
import Issue from '@/app/lib/models/issue'

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
    return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })
  }

  try {
    await connectToDatabase()

    const issue = await Issue.findById(id).lean()
    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    const applicant = await Applicant.create({
      userId: tokenPayload.id,
      issueId: id,
    })

    const serialized = serializeApplicant(applicant.toObject())
    getIssueAudienceIds(id).then((audience) =>
      emitIssueApplicantAdded({ issueId: id, applicant: serialized }, audience)
    ).catch(() => {})
    return NextResponse.json({ applicant: serialized }, { status: 201 })
  } catch (err: any) {
    if (err.code === 11000) {
      return NextResponse.json({ error: 'Already applied to this need' }, { status: 409 })
    }
    console.error('[mobile/issues/applicants POST]', err)
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
    return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })
  }

  try {
    await connectToDatabase()

    const result = await Applicant.findOneAndDelete({ userId: tokenPayload.id, issueId: id })
    if (!result) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    const applicantId = result._id.toString()
    getIssueAudienceIds(id).then((audience) =>
      emitIssueApplicantRemoved({ issueId: id, applicantId }, audience)
    ).catch(() => {})
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[mobile/issues/applicants DELETE]', err)
    return NextResponse.json({ error: 'Failed to withdraw application' }, { status: 500 })
  }
}
