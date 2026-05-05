// app/api/mobile/issues/[id]/route.ts
// GET    — fetch a single issue
// PATCH  — update an issue (author only)
// DELETE — remove an issue (author only)

import { isValidObjectId, USER_WITH_AVATAR_POPULATE } from '@/app/lib/utils/validation'
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import { serializeIssue } from '@/app/lib/mobile/serializers'
import Issue from '@/app/lib/models/issue'
import Pledge from '@/app/lib/models/pledge'
import Applicant from '@/app/lib/models/applicant'
import Commission from '@/app/lib/models/commission'
import stripe from '@/app/lib/stripe'
import '@/app/lib/models/image'
import '@/app/lib/models/user'

export const GET = withAuth(async (req, token, ctx) => {
  const { id } = await ctx.params
  if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })

  try {
    await connectToDatabase()
    const need = await Issue.findById(id)
      .populate({ path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } })
      .populate('image')
      .lean()
    if (!need) return NextResponse.json({ error: 'Issue not found' }, { status: 404 })

    const [pledges, applicants] = await Promise.all([
      Pledge.find({ issueId: id }).populate(USER_WITH_AVATAR_POPULATE).lean(),
      Applicant.find({ issueId: id }).lean(),
    ])
    return NextResponse.json({ issue: serializeIssue({ ...need, pledged: pledges, applicants }) })
  } catch (err) {
    console.error('[mobile/issues GET by id]', err)
    return NextResponse.json({ error: 'Failed to fetch issue' }, { status: 500 })
  }
})

export const PATCH = withAuth(async (req, token, ctx) => {
  const { id } = await ctx.params
  if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })

  try {
    const { issueType, content, imageId, location, locationVisible } = await req.json()

    const validIssueTypes = ['Clean Up', 'Gardening', 'Hauling']
    if (issueType !== undefined && !validIssueTypes.includes(issueType))
      return NextResponse.json({ error: 'Invalid issue type' }, { status: 400 })
    if (content !== undefined && content.length > 5000)
      return NextResponse.json({ error: 'Content must be 5000 characters or less' }, { status: 400 })
    if (imageId !== undefined && imageId !== null && !isValidObjectId(imageId))
      return NextResponse.json({ error: 'Invalid image ID' }, { status: 400 })

    await connectToDatabase()
    const need = await Issue.findById(id)
    if (!need) return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    if (need.author.toString() !== token.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    if (issueType !== undefined) need.issueType = issueType
    if (content !== undefined) need.content = content.trim()
    if (imageId !== undefined) need.image = imageId ?? undefined
    if (location !== undefined) {
      need.location = location !== null && typeof location.latitude === 'number' && typeof location.longitude === 'number'
        ? { latitude: location.latitude, longitude: location.longitude }
        : undefined
      need.markModified('location')
    }
    if (typeof locationVisible === 'boolean') need.locationVisible = locationVisible

    await need.save()
    await need.populate([
      { path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } },
      { path: 'image' },
    ])
    const [pledges, applicants] = await Promise.all([
      Pledge.find({ issueId: id }).populate(USER_WITH_AVATAR_POPULATE).lean(),
      Applicant.find({ issueId: id }).lean(),
    ])
    return NextResponse.json({ issue: serializeIssue({ ...need.toObject(), pledged: pledges, applicants }) })
  } catch (err) {
    console.error('[mobile/issues PATCH]', err)
    return NextResponse.json({ error: 'Failed to update issue' }, { status: 500 })
  }
})

export const DELETE = withAuth(async (req, token, ctx) => {
  const { id } = await ctx.params
  if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })

  try {
    await connectToDatabase()
    const need = await Issue.findById(id)
    if (!need) return NextResponse.json({ error: 'Issue not found' }, { status: 404 })

    const isAuthor = need.author.toString() === token.id
    const isAdmin = token.role === 'admin'
    if (!isAuthor && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const pledges = await Pledge.find({ issueId: id, stripePaymentIntentId: { $exists: true, $ne: null } }).lean()
    await Promise.allSettled(
      (pledges as any[]).map(async (p) => {
        try {
          const pi = await stripe.paymentIntents.retrieve(p.stripePaymentIntentId)
          if (pi.status === 'requires_capture') await stripe.paymentIntents.cancel(p.stripePaymentIntentId)
          else if (pi.status === 'succeeded') await stripe.refunds.create({ payment_intent: p.stripePaymentIntentId })
        } catch (err) {
          console.error(`[issues DELETE] Failed to release PI ${p.stripePaymentIntentId}:`, err)
        }
      })
    )
    await Promise.all([
      Issue.findByIdAndDelete(id),
      Pledge.deleteMany({ issueId: id }),
      Applicant.deleteMany({ issueId: id }),
      Commission.deleteMany({ issueId: id }),
    ])
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[mobile/issues DELETE]', err)
    return NextResponse.json({ error: 'Failed to delete issue' }, { status: 500 })
  }
})
