// app/api/mobile/issues/[id]/applicants/route.ts
// POST   — apply to an issue
// DELETE — withdraw application

import { isValidObjectId } from '@/app/lib/utils/validation'
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import { serializeApplicant } from '@/app/lib/mobile/serializers'
import { getIssueAudienceIds, emitIssueApplicantAdded, emitIssueApplicantRemoved } from '@/app/lib/socket/emit'
import Applicant from '@/app/lib/models/applicant'
import Issue from '@/app/lib/models/issue'

export const POST = withAuth(async (req, token, ctx) => {
  const { id } = await ctx.params
  if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })

  try {
    await connectToDatabase()

    const body = await req.json().catch(() => ({}))
    const bidAmount = typeof body.bidAmount === 'number' && body.bidAmount > 0 ? body.bidAmount : undefined

    const issue = await Issue.findById(id).lean()
    if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 })

    const existing = await Applicant.findOne({ userId: token.id, issueId: id }).lean()
    if (existing) return NextResponse.json({ error: 'Already applied to this issue' }, { status: 409 })

    const applicant = await Applicant.create({ userId: token.id, issueId: id, bidAmount })
    const serialized = serializeApplicant(applicant.toObject())
    getIssueAudienceIds(id).then((audience) =>
      emitIssueApplicantAdded({ issueId: id, applicant: serialized }, audience)
    ).catch((err: any) => console.warn('[socket]', err?.message ?? err))
    return NextResponse.json({ applicant: serialized }, { status: 201 })
  } catch (err: any) {
    if (err.code === 11000) return NextResponse.json({ error: 'Already applied to this issue' }, { status: 409 })
    console.error('[mobile/issues/applicants POST]', err)
    return NextResponse.json({ error: 'Failed to apply' }, { status: 500 })
  }
})

export const PATCH = withAuth(async (req, token, ctx) => {
  const { id } = await ctx.params
  if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })

  try {
    const { bidAmount } = await req.json()
    if (typeof bidAmount !== 'number' || bidAmount <= 0)
      return NextResponse.json({ error: 'Bid amount must be a positive number' }, { status: 400 })

    await connectToDatabase()
    const applicant = await Applicant.findOneAndUpdate(
      { userId: token.id, issueId: id, status: 'pending' },
      { $set: { bidAmount } },
      { new: true }
    )
    if (!applicant) return NextResponse.json({ error: 'Active application not found' }, { status: 404 })

    const serialized = serializeApplicant(applicant.toObject())
    getIssueAudienceIds(id).then((audience) =>
      emitIssueApplicantAdded({ issueId: id, applicant: serialized }, audience)
    ).catch((err: any) => console.warn('[socket]', err?.message ?? err))
    return NextResponse.json({ applicant: serialized })
  } catch (err) {
    console.error('[mobile/issues/applicants PATCH]', err)
    return NextResponse.json({ error: 'Failed to update bid' }, { status: 500 })
  }
})

export const DELETE = withAuth(async (req, token, ctx) => {
  const { id } = await ctx.params
  if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })

  try {
    await connectToDatabase()
    const result = await Applicant.findOneAndDelete({ userId: token.id, issueId: id })
    if (!result) return NextResponse.json({ error: 'Application not found' }, { status: 404 })

    const applicantId = result._id.toString()
    getIssueAudienceIds(id).then((audience) =>
      emitIssueApplicantRemoved({ issueId: id, applicantId }, audience)
    ).catch((err: any) => console.warn('[socket]', err?.message ?? err))
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[mobile/issues/applicants DELETE]', err)
    return NextResponse.json({ error: 'Failed to withdraw application' }, { status: 500 })
  }
})
