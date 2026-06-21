// api/routes/mobile/issues/sub.ts
// Sub-routes for a single issue: applicants, pledges, commission, reports, images, flag, complete

import { Hono } from 'hono'
import mongoose from 'mongoose'
import { authMiddleware, TokenPayload } from '../../../middleware/auth'
import { connectToDatabase } from '../../../../app/lib/mongoose'
import {
  serializeIssue,
  serializeCompletion,
  serializeApplicant,
  serializePledge,
} from '../../../../app/lib/mobile/serializers'
import { isValidObjectId, USER_WITH_AVATAR_POPULATE, APPLICANT_USER_POPULATE } from '../../../../app/lib/utils/validation'
import { calculateAverageRating } from '../../../../app/lib/utils/ratingUtils'
import { midnightFollowingDay } from '../../../../app/lib/mobile/deadlines'
import { settleIssue } from '../../../../app/lib/mobile/settleIssue'
import { createPledgeWithPaymentIntent } from '../../../../app/lib/mobile/createPledge'
import { deleteIssueWithCleanup } from '../../../../app/lib/mobile/deleteIssue'
import { releasePledgeHolds } from '../../../../app/lib/mobile/pledgePayments'
import { tryAutoAccept } from '../../../lib/autoAccept'
import { holdPledges } from '../../../../app/lib/mobile/pledgePayments'
import {
  emitIssueApplicantAdded,
  emitIssueApplicantRemoved,
  emitIssueApplicantAccepted,
  emitIssueCompletionSubmitted,
  emitIssueCompletionReviewed,
  emitIssuePledgeAdded,
  emitIssuePledgeRemoved,
} from '../../../lib/socketEmit'
import Issue from '../../../../app/lib/models/issue'
import Applicant from '../../../../app/lib/models/applicant'
import Pledge from '../../../../app/lib/models/pledge'
import Rating from '../../../../app/lib/models/rating'
import Fee from '../../../../app/lib/models/fee'
import ImageModel from '../../../../app/lib/models/image'
import stripe from '../../../../app/lib/stripe'
import { deleteS3File } from '../../../../app/lib/aws/s3'
import '../../../../app/lib/models/user'

const sub = new Hono<{ Variables: { token: TokenPayload } }>()

// ─── Applicants ─────────────────────────────────────────────────────────────

sub.post('/api/mobile/issues/:id/applicants', authMiddleware, async (c) => {
  const token = c.get('token')
  const id = c.req.param('id')
  if (!isValidObjectId(id)) return c.json({ error: 'Invalid issue ID' }, 400)

  try {
    await connectToDatabase()
    const body = await c.req.json().catch(() => ({}))
    const rawBid = body.bidAmount
    const bidAmount = typeof rawBid === 'number' && Number.isFinite(rawBid) && rawBid > 0 && rawBid <= 10000 ? rawBid : undefined
    const acceptPledge = body.acceptPledge === true

    const issue = await Issue.findById(id).lean()
    if (!issue) return c.json({ error: 'Issue not found' }, 404)

    const [existing, pledge] = await Promise.all([
      Applicant.findOne({ userId: token.id, issueId: id }).lean(),
      Pledge.findOne({ issueId: id, userId: token.id }).lean(),
    ])
    if (existing) return c.json({ error: 'Already applied to this issue' }, 409)
    if (pledge) return c.json({ error: 'Contributors cannot place a bid on an issue they have funded' }, 403)

    const applicant = await Applicant.create({ userId: token.id, issueId: id, bidAmount })

    // acceptPledge: accept immediately if sole applicant, otherwise join the queue
    if (acceptPledge) {
      const otherApplicants = await Applicant.exists({ issueId: id, _id: { $ne: applicant._id }, status: 'pending' })
      if (!otherApplicants) {
        const accepted = await Applicant.findByIdAndUpdate(
          applicant._id,
          { status: 'accepted', acceptedAt: new Date(), completionDeadline: midnightFollowingDay() },
          { new: true },
        ).populate(APPLICANT_USER_POPULATE)
        holdPledges(id).catch((err) => console.error('[acceptPledge] holdPledges failed:', err))
        const serialized = serializeApplicant(accepted!.toObject())
        emitIssueApplicantAccepted({ issueId: id, applicant: serialized })
          .catch((err: any) => console.warn('[socket]', err?.message ?? err))
        return c.json({ applicant: serialized }, 201)
      }
    }

    if (bidAmount != null) {
      const winner = await tryAutoAccept(id, [applicant._id])
      if (winner) {
        emitIssueApplicantAccepted({ issueId: id, applicant: winner })
          .catch((err: any) => console.warn('[socket]', err?.message ?? err))
        return c.json({ applicant: winner }, 201)
      }
    }

    await applicant.populate(APPLICANT_USER_POPULATE)
    const serialized = serializeApplicant(applicant.toObject())
    emitIssueApplicantAdded({ issueId: id, applicant: serialized })
      .catch((err: any) => console.warn('[socket]', err?.message ?? err))
    return c.json({ applicant: serialized }, 201)
  } catch (err: any) {
    if (err.code === 11000) return c.json({ error: 'Already applied to this issue' }, 409)
    console.error('[mobile/issues/applicants POST]', err)
    return c.json({ error: 'Failed to apply' }, 500)
  }
})

sub.patch('/api/mobile/issues/:id/applicants', authMiddleware, async (c) => {
  const token = c.get('token')
  const id = c.req.param('id')
  if (!isValidObjectId(id)) return c.json({ error: 'Invalid issue ID' }, 400)

  try {
    const { bidAmount } = await c.req.json()
    if (typeof bidAmount !== 'number' || !Number.isFinite(bidAmount) || bidAmount <= 0 || bidAmount > 10000)
      return c.json({ error: 'Bid amount must be a number between 0 and 10,000' }, 400)

    await connectToDatabase()
    const applicant = await Applicant.findOneAndUpdate(
      { userId: token.id, issueId: id, status: 'pending' },
      { $set: { bidAmount } },
      { new: true }
    )
    if (!applicant) return c.json({ error: 'Active application not found' }, 404)

    const winner = await tryAutoAccept(id, [applicant._id])
    if (winner) {
      emitIssueApplicantAccepted({ issueId: id, applicant: winner })
        .catch((err: any) => console.warn('[socket]', err?.message ?? err))
      return c.json({ applicant: winner })
    }

    await applicant.populate(APPLICANT_USER_POPULATE)
    const serialized = serializeApplicant(applicant.toObject())
    emitIssueApplicantAdded({ issueId: id, applicant: serialized })
      .catch((err: any) => console.warn('[socket]', err?.message ?? err))
    return c.json({ applicant: serialized })
  } catch (err) {
    console.error('[mobile/issues/applicants PATCH]', err)
    return c.json({ error: 'Failed to update bid' }, 500)
  }
})

sub.delete('/api/mobile/issues/:id/applicants', authMiddleware, async (c) => {
  const token = c.get('token')
  const id = c.req.param('id')
  if (!isValidObjectId(id)) return c.json({ error: 'Invalid issue ID' }, 400)

  try {
    await connectToDatabase()
    const result = await Applicant.findOneAndDelete({ userId: token.id, issueId: id })
    if (!result) return c.json({ error: 'Application not found' }, 404)

    const applicantId = result._id.toString()
    emitIssueApplicantRemoved({ issueId: id, applicantId })
      .catch((err: any) => console.warn('[socket]', err?.message ?? err))
    return c.json({ ok: true })
  } catch (err) {
    console.error('[mobile/issues/applicants DELETE]', err)
    return c.json({ error: 'Failed to withdraw application' }, 500)
  }
})

// DELETE /api/mobile/issues/:id/applicants/:applicantId — author denies specific applicant
sub.delete('/api/mobile/issues/:id/applicants/:applicantId', authMiddleware, async (c) => {
  const token = c.get('token')
  const issueId = c.req.param('id')
  const applicantId = c.req.param('applicantId')
  if (!isValidObjectId(issueId)) return c.json({ error: 'Invalid issue ID' }, 400)
  if (!isValidObjectId(applicantId)) return c.json({ error: 'Invalid applicant ID' }, 400)

  try {
    await connectToDatabase()
    const issue = await Issue.findById(issueId, { author: 1 }).lean() as any
    if (!issue) return c.json({ error: 'Issue not found' }, 404)
    if (issue.author.toString() !== token.id)
      return c.json({ error: 'Only the author can deny applicants' }, 403)

    const applicant = await Applicant.findOneAndDelete({ _id: applicantId, issueId, status: 'pending' })
    if (!applicant) return c.json({ error: 'Applicant not found or already accepted' }, 404)

    emitIssueApplicantRemoved({ issueId, applicantId })
      .catch((err: any) => console.warn('[socket]', err?.message ?? err))
    return c.json({ ok: true })
  } catch (err) {
    console.error('[mobile/issues/applicants/:applicantId DELETE]', err)
    return c.json({ error: 'Failed to deny applicant' }, 500)
  }
})

// ─── Pledges ────────────────────────────────────────────────────────────────

sub.post('/api/mobile/issues/:id/pledges', authMiddleware, async (c) => {
  const token = c.get('token')
  const id = c.req.param('id')
  if (!isValidObjectId(id)) return c.json({ error: 'Invalid issue ID' }, 400)

  try {
    const body = await c.req.json()
    const { amount, applicantId, rescindIfLost, anonymous } = body

    if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0 || amount > 10000)
      return c.json({ error: 'Amount must be a number between 0 and 10,000' }, 400)

    if (applicantId && !isValidObjectId(applicantId))
      return c.json({ error: 'Invalid applicant ID' }, 400)

    await connectToDatabase()

    const issue = await Issue.findById(id).lean() as any
    if (!issue) return c.json({ error: 'Issue not found' }, 404)

    if (applicantId) {
      const target = await Applicant.findOne({ _id: applicantId, issueId: id }).lean() as any
      if (!target) return c.json({ error: 'Applicant not found' }, 404)
      if (target.userId.toString() === token.id)
        return c.json({ error: 'You cannot pledge to your own bid' }, 403)
    }

    const pledge = await createPledgeWithPaymentIntent(token.id, id, amount)
    if (applicantId) pledge.applicantId = applicantId
    pledge.rescindIfLost = rescindIfLost === true
    pledge.anonymous = anonymous === true
    await pledge.save()
    await pledge.populate(USER_WITH_AVATAR_POPULATE)

    const serialized = serializePledge(pledge.toObject())
    emitIssuePledgeAdded({ issueId: id, actorId: token.id, pledge: serialized })
      .catch((err: any) => console.warn('[socket]', err?.message ?? err))

    // Check all pending bidders — pledge may have tipped the funding threshold.
    // tryAutoAccept handles loser directed-pledge cleanup internally.
    const winner = await tryAutoAccept(id)
    if (winner) {
      emitIssueApplicantAccepted({ issueId: id, applicant: winner })
        .catch((err: any) => console.warn('[socket]', err?.message ?? err))
    }

    return c.json({ pledge: serialized }, 201)
  } catch (err: any) {
    if (err.code === 'NO_PAYMENT_METHOD')
      return c.json({ error: err.message, code: 'NO_PAYMENT_METHOD' }, 402)
    console.error('[mobile/issues/pledges POST]', err)
    return c.json({ error: 'Failed to create pledge' }, 500)
  }
})

sub.delete('/api/mobile/issues/:id/pledges/:pledgeId', authMiddleware, async (c) => {
  const token = c.get('token')
  const pledgeId = c.req.param('pledgeId')
  if (!isValidObjectId(pledgeId)) return c.json({ error: 'Invalid pledge ID' }, 400)

  try {
    await connectToDatabase()
    const pledge = await Pledge.findById(pledgeId)
    if (!pledge) return c.json({ error: 'Pledge not found' }, 404)
    if (pledge.userId.toString() !== token.id) return c.json({ error: 'Forbidden' }, 403)

    const acceptedApplicant = await Applicant.findOne({ issueId: pledge.issueId, status: 'accepted' }, '_id').lean()
    if (acceptedApplicant)
      return c.json({ error: 'A worker has been accepted — your pledge cannot be removed' }, 409)

    const issueId = pledge.issueId.toString()
    await pledge.deleteOne()

    emitIssuePledgeRemoved({ issueId, actorId: token.id, pledgeId })
      .catch((err: any) => console.warn('[socket]', err?.message ?? err))
    return c.json({ ok: true })
  } catch (err) {
    console.error('[mobile/issues/pledges DELETE]', err)
    return c.json({ error: 'Failed to delete pledge' }, 500)
  }
})

// ─── Reports ────────────────────────────────────────────────────────────────

sub.post('/api/mobile/issues/:id/reports', authMiddleware, async (c) => {
  const token = c.get('token')
  const id = c.req.param('id')
  if (!isValidObjectId(id)) return c.json({ error: 'Invalid issue ID' }, 400)

  try {
    const { imageId, content } = await c.req.json()

    if (imageId !== undefined && imageId !== null && !isValidObjectId(imageId))
      return c.json({ error: 'Invalid image ID' }, 400)

    await connectToDatabase()
    const issue = await Issue.findById(id)
    if (!issue) return c.json({ error: 'Issue not found' }, 404)
    if (issue.status !== 'open') return c.json({ error: 'Issue is not open' }, 409)

    issue.reports = issue.reports ?? []
    issue.reports.push({
      userId: token.id,
      ...(imageId ? { imageId } : {}),
      ...(content?.trim() ? { content: content.trim() } : {}),
    } as any)

    await issue.save()
    await issue.populate([
      { path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } },
      { path: 'images' },
      { path: 'reports.userId', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } },
      { path: 'reports.imageId', select: '_id variants' },
    ])

    const [pledges, applicants] = await Promise.all([
      Pledge.find({ issueId: id }).populate(USER_WITH_AVATAR_POPULATE).lean(),
      Applicant.find({ issueId: id }).populate(APPLICANT_USER_POPULATE).lean(),
    ])

    return c.json({ issue: serializeIssue({ ...issue.toObject(), pledged: pledges, applicants }) })
  } catch (err) {
    console.error('[mobile/issues/reports POST]', err)
    return c.json({ error: 'Failed to add report' }, 500)
  }
})

// ─── Add image to issue ──────────────────────────────────────────────────────

sub.post('/api/mobile/issues/:id/images', authMiddleware, async (c) => {
  const token = c.get('token')
  const id = c.req.param('id')
  if (!isValidObjectId(id)) return c.json({ error: 'Invalid issue ID' }, 400)

  try {
    const { imageId } = await c.req.json()
    if (!imageId || !isValidObjectId(imageId))
      return c.json({ error: 'Invalid image ID' }, 400)

    await connectToDatabase()
    const issue = await Issue.findById(id)
    if (!issue) return c.json({ error: 'Issue not found' }, 404)
    if (issue.author.toString() !== token.id) return c.json({ error: 'Forbidden' }, 403)

    ;(issue as any).images.push(imageId)
    await issue.save()
    await issue.populate([
      { path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } },
      { path: 'images' },
    ])

    const [pledges, applicants] = await Promise.all([
      Pledge.find({ issueId: id }).populate(USER_WITH_AVATAR_POPULATE).lean(),
      Applicant.find({ issueId: id }).populate(APPLICANT_USER_POPULATE).lean(),
    ])

    return c.json({ issue: serializeIssue({ ...issue.toObject(), pledged: pledges, applicants }) })
  } catch (err) {
    console.error('[mobile/issues/:id/images POST]', err)
    return c.json({ error: 'Failed to add image' }, 500)
  }
})

// ─── Flag ────────────────────────────────────────────────────────────────────

sub.post('/api/mobile/issues/:id/flag', authMiddleware, async (c) => {
  const token = c.get('token')
  const id = c.req.param('id')
  if (!isValidObjectId(id)) return c.json({ error: 'Invalid issue ID' }, 400)

  try {
    await connectToDatabase()
    const issue = await Issue.findOneAndUpdate(
      { _id: id, flaggedBy: { $ne: token.id } },
      { flagged: true, $addToSet: { flaggedBy: token.id } },
      { new: true }
    ).lean()
    if (!issue) return c.json({ error: 'Already flagged or not found' }, 409)
    return c.json({ ok: true })
  } catch (err) {
    console.error('[mobile/issues/flag POST]', err)
    return c.json({ error: 'Failed to flag issue' }, 500)
  }
})

sub.patch('/api/mobile/issues/:id/flag', authMiddleware, async (c) => {
  const token = c.get('token')
  const id = c.req.param('id')
  if (!isValidObjectId(id)) return c.json({ error: 'Invalid issue ID' }, 400)
  if (token.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)

  const { action } = await c.req.json()
  if (action !== 'approve' && action !== 'dismiss')
    return c.json({ error: 'Action must be "approve" or "dismiss"' }, 400)

  try {
    await connectToDatabase()
    if (action === 'approve') {
      await deleteIssueWithCleanup(id, true)
    } else {
      await Issue.findByIdAndUpdate(id, { flagged: false })
    }
    return c.json({ ok: true })
  } catch (err) {
    console.error('[mobile/issues/flag PATCH]', err)
    return c.json({ error: 'Failed to review flag' }, 500)
  }
})

// ─── Commission (completion) ─────────────────────────────────────────────────

sub.get('/api/mobile/issues/:id/commission', authMiddleware, async (c) => {
  const token = c.get('token')
  const issueId = c.req.param('id')
  if (!isValidObjectId(issueId)) return c.json({ error: 'Invalid issue ID' }, 400)

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
        const [myDoc, allRatings] = await Promise.all([
          Rating.findOne({ commissionId, raterId: token.id }).lean() as any,
          Rating.find({ commissionId }).lean() as unknown as any[],
        ])
        myRating = myDoc?.score ?? null
        averageRating = calculateAverageRating(allRatings)
        ratingCount = allRatings.length
      } catch {}
    }

    return c.json({
      completion: completion ? serializeCompletion(completion, issueId) : null,
      myRating,
      averageRating,
      ratingCount,
    })
  } catch (err) {
    console.error('[mobile/issues/commission GET]', err)
    return c.json({ error: 'Failed to fetch completion' }, 500)
  }
})

sub.post('/api/mobile/issues/:id/commission', authMiddleware, async (c) => {
  const token = c.get('token')
  const issueId = c.req.param('id')
  if (!isValidObjectId(issueId)) return c.json({ error: 'Invalid issue ID' }, 400)

  const { imageIds } = await c.req.json()
  if (!Array.isArray(imageIds) || imageIds.length === 0)
    return c.json({ error: 'At least one image is required' }, 400)
  if (imageIds.some((id: any) => !isValidObjectId(id)))
    return c.json({ error: 'Invalid image ID' }, 400)

  try {
    await connectToDatabase()
    const applicant = await Applicant.findOne({ issueId, userId: token.id, status: 'accepted' }).lean()
    if (!applicant)
      return c.json({ error: 'Only the accepted applicant can submit completion evidence' }, 403)

    const ownedImages = await ImageModel.find({ _id: { $in: imageIds }, userId: token.id }, '_id').lean()
    if (ownedImages.length !== imageIds.length)
      return c.json({ error: 'One or more images not found or not owned by you' }, 403)

    const issue = await Issue.findById(issueId)
    if (!issue) return c.json({ error: 'Issue not found' }, 404)

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
    emitIssueCompletionSubmitted({ issueId, completion: serialized })
      .catch((err: any) => console.warn('[socket]', err?.message ?? err))
    return c.json({ completion: serialized })
  } catch (err) {
    console.error('[mobile/issues/commission POST]', err)
    return c.json({ error: 'Failed to submit completion' }, 500)
  }
})

// PATCH /api/mobile/issues/:id/commission/start
sub.patch('/api/mobile/issues/:id/commission/start', authMiddleware, async (c) => {
  const token = c.get('token')
  const issueId = c.req.param('id')
  if (!isValidObjectId(issueId)) return c.json({ error: 'Invalid issue ID' }, 400)

  try {
    await connectToDatabase()
    const applicant = await Applicant.findOneAndUpdate(
      { issueId, userId: token.id, status: 'accepted' },
      { $set: { startedAt: new Date() } },
      { new: true }
    ).populate(APPLICANT_USER_POPULATE)
    if (!applicant) return c.json({ error: 'Only the accepted applicant can start work' }, 403)
    const serialized = serializeApplicant(applicant.toObject())
    emitIssueApplicantAccepted({ issueId, applicant: serialized })
      .catch((err: any) => console.warn('[socket]', err?.message ?? err))
    return c.json({ applicant: serialized })
  } catch (err) {
    console.error('[commission/start PATCH]', err)
    return c.json({ error: 'Failed to start commission' }, 500)
  }
})

// PATCH /api/mobile/issues/:id/commission/extend
sub.patch('/api/mobile/issues/:id/commission/extend', authMiddleware, async (c) => {
  const token = c.get('token')
  const issueId = c.req.param('id')
  if (!isValidObjectId(issueId)) return c.json({ error: 'Invalid issue ID' }, 400)

  try {
    await connectToDatabase()
    const issue = await Issue.findById(issueId).lean() as any
    if (!issue) return c.json({ error: 'Issue not found' }, 404)
    if (issue.author.toString() !== token.id)
      return c.json({ error: 'Only the author can extend the deadline' }, 403)

    const applicant = await Applicant.findOne({ issueId, status: 'accepted' }).populate(APPLICANT_USER_POPULATE)
    if (!applicant) return c.json({ error: 'No accepted applicant found' }, 404)

    applicant.completionDeadline = midnightFollowingDay()
    await applicant.save()

    const serialized = serializeApplicant(applicant.toObject())
    emitIssueApplicantAccepted({ issueId, applicant: serialized })
      .catch((err: any) => console.warn('[socket]', err?.message ?? err))
    return c.json({ applicant: serialized })
  } catch (err) {
    console.error('[commission/extend PATCH]', err)
    return c.json({ error: 'Failed to extend deadline' }, 500)
  }
})

// POST /api/mobile/issues/:id/commission/reassign
sub.post('/api/mobile/issues/:id/commission/reassign', authMiddleware, async (c) => {
  const token = c.get('token')
  const issueId = c.req.param('id')
  if (!isValidObjectId(issueId)) return c.json({ error: 'Invalid issue ID' }, 400)

  try {
    await connectToDatabase()
    const issue = await Issue.findById(issueId).lean() as any
    if (!issue) return c.json({ error: 'Issue not found' }, 404)
    if (issue.author.toString() !== token.id)
      return c.json({ error: 'Only the author can reassign the contract' }, 403)

    const current = await Applicant.findOne({ issueId, status: 'accepted' }).populate(APPLICANT_USER_POPULATE)
    if (!current) return c.json({ error: 'No accepted applicant to reassign from' }, 404)

    current.status = 'pending'
    current.acceptedAt = undefined
    current.completionDeadline = undefined
    await current.save()

    const releasedSerialized = serializeApplicant(current.toObject())

    const [allPledges, candidates] = await Promise.all([
      Pledge.find({ issueId }).lean() as Promise<any[]>,
      Applicant.find({ issueId, status: 'pending', bidAmount: { $exists: true, $ne: null }, _id: { $ne: current._id } })
        .sort({ createdAt: 1 }).lean() as Promise<any[]>,
    ])

    // Re-use selectFundedWinner directly here since we've already fetched the
    // candidate list and pledges — avoids a second round-trip inside tryAutoAccept.
    const { selectFundedWinner } = await import('../../../../app/lib/mobile/fundingUtils')
    const winner = await selectFundedWinner(candidates, allPledges)

    if (!winner) {
      emitIssueApplicantAdded({ issueId, applicant: releasedSerialized })
        .catch((err: any) => console.warn('[socket]', err?.message ?? err))
      return c.json({ applicant: releasedSerialized, nextApplicant: null })
    }

    const nextApplicant = await Applicant.findByIdAndUpdate(
      winner._id,
      { status: 'accepted', acceptedAt: new Date(), completionDeadline: midnightFollowingDay() },
      { new: true }
    ).populate(APPLICANT_USER_POPULATE)

    const nextSerialized = serializeApplicant(nextApplicant!.toObject())

    holdPledges(issueId).catch((err) => console.error('[reassign] holdPledges failed:', err))

    emitIssueApplicantAdded({ issueId, applicant: releasedSerialized })
      .catch((err: any) => console.warn('[socket]', err?.message ?? err))
    emitIssueApplicantAccepted({ issueId, applicant: nextSerialized })
      .catch((err: any) => console.warn('[socket]', err?.message ?? err))

    return c.json({ applicant: releasedSerialized, nextApplicant: nextSerialized })
  } catch (err) {
    console.error('[commission/reassign POST]', err)
    return c.json({ error: 'Failed to reassign contract' }, 500)
  }
})

// POST /api/mobile/issues/:id/commission/rating
sub.post('/api/mobile/issues/:id/commission/rating', authMiddleware, async (c) => {
  const token = c.get('token')
  const issueId = c.req.param('id')
  if (!isValidObjectId(issueId)) return c.json({ error: 'Invalid issue ID' }, 400)

  const { score } = await c.req.json()
  if (!Number.isInteger(score) || score < 1 || score > 5)
    return c.json({ error: 'Score must be an integer between 1 and 5' }, 400)

  try {
    await connectToDatabase()
    const issue = await Issue.findById(issueId).select('completion author').lean() as any
    if (!issue?.completion) return c.json({ error: 'No completion found' }, 404)
    if (!['pending', 'approved'].includes(issue.completion.status))
      return c.json({ error: 'Completion is not available for rating' }, 400)

    const isAuthor = issue.author.toString() === token.id
    if (!isAuthor) {
      const pledge = await Pledge.findOne({ issueId, userId: token.id }).lean()
      if (!pledge) return c.json({ error: 'Only the author or contributors can rate' }, 403)
    }

    const acceptedApplicant = await Applicant.findOne({ issueId, status: 'accepted' }).lean() as any
    if (!acceptedApplicant) return c.json({ error: 'No accepted applicant found' }, 404)

    const commissionId = issue.completion._id
    await Rating.findOneAndUpdate(
      { commissionId, raterId: token.id },
      { issueId, commissionId, raterId: token.id, workerId: acceptedApplicant.userId, score },
      { upsert: true }
    )

    const allRatings = await Rating.find({ commissionId }).lean() as any[]
    const averageRating = calculateAverageRating(allRatings)

    let autoDecision: 'approved' | 'denied' | null = null
    if (issue.completion.status === 'pending') {
      const pledges = await Pledge.find({ issueId }).select('userId').lean() as any[]
      const pledgerIds = pledges.map((p: any) => p.userId.toString())
      const requiredRaterIds = [...new Set([issue.author.toString(), ...pledgerIds])]
      const raterIds = allRatings.map((r: any) => r.raterId.toString())
      const allHaveRated = requiredRaterIds.every((id) => raterIds.includes(id))
      if (allHaveRated) {
        autoDecision = averageRating !== null && averageRating >= 4 ? 'approved' : 'denied'
      }
    }

    let serializedCompletion: any = null
    let serializedNeed: any = null

    if (autoDecision === 'approved') {
      const claimed = await Issue.findOneAndUpdate(
        { _id: issueId, 'completion.status': 'pending' },
        { $set: { 'completion.status': 'approved' } }
      )
      if (claimed) {
        try {
          await settleIssue(issueId)
          await Issue.findByIdAndUpdate(issueId, { $set: { status: 'completed' } })
        } catch (err) {
          console.error('[commission/rating] settleIssue failed:', err)
        }
      }
    } else if (autoDecision === 'denied') {
      await Issue.findOneAndUpdate(
        { _id: issueId, 'completion.status': 'pending' },
        { $set: { 'completion.status': 'denied' } }
      )
      await Applicant.findByIdAndUpdate(acceptedApplicant._id, { completionDeadline: midnightFollowingDay() })
      const eligibleCount = await Applicant.countDocuments({
        issueId, status: 'pending', bidAmount: { $exists: true, $ne: null },
      })
      if (eligibleCount === 0) {
        releasePledgeHolds(issueId).catch((err) => console.error('[commission/rating] releasePledgeHolds failed:', err))
      }
    }

    if (autoDecision) {
      const updatedIssue = await Issue.findById(issueId)
        .populate({ path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } })
        .populate('images')
        .populate('completion.images')
        .lean() as any

      serializedCompletion = serializeCompletion(updatedIssue.completion, issueId)

      if (autoDecision === 'approved') {
        const [p, a] = await Promise.all([
          Pledge.find({ issueId }).populate(USER_WITH_AVATAR_POPULATE).lean(),
          Applicant.find({ issueId }).populate(APPLICANT_USER_POPULATE).lean(),
        ])
        serializedNeed = serializeIssue({ ...updatedIssue, pledged: p, applicants: a })
      }

      emitIssueCompletionReviewed({
        issueId,
        completion: serializedCompletion,
        ...(serializedNeed ? { issue: serializedNeed } : {}),
      }).catch((err: any) => console.warn('[socket]', err?.message ?? err))
    }

    return c.json({
      score,
      averageRating,
      ratingCount: allRatings.length,
      ...(serializedCompletion ? { completion: serializedCompletion } : {}),
      ...(serializedNeed ? { issue: serializedNeed } : {}),
    })
  } catch (err: any) {
    console.error('[commission/rating POST]', err)
    return c.json({ error: 'Failed to submit rating' }, 500)
  }
})

// POST /api/mobile/issues/:id/commission/review
sub.post('/api/mobile/issues/:id/commission/review', authMiddleware, async (c) => {
  const token = c.get('token')
  const issueId = c.req.param('id')
  if (!isValidObjectId(issueId)) return c.json({ error: 'Invalid issue ID' }, 400)

  const { rating } = await c.req.json()
  if (!Number.isInteger(rating) || rating < 0 || rating > 5)
    return c.json({ error: 'Rating must be an integer between 0 and 5' }, 400)
  const vote = rating === 0 ? 'deny' : 'approve'

  try {
    await connectToDatabase()

    const [pledge, issue] = await Promise.all([
      Pledge.findOne({ issueId, userId: token.id }).lean(),
      Issue.findById(issueId).lean() as any,
    ])
    const isAuthorReviewing = issue?.author?.toString() === token.id
    if (!pledge && !isAuthorReviewing)
      return c.json({ error: 'Only contributors or the author can review completion' }, 403)

    if (!issue?.completion)
      return c.json({ error: 'No completion submission found' }, 404)
    if (issue.completion.status !== 'pending')
      return c.json({ error: 'Submission is no longer pending' }, 400)

    const reviews = issue.completion.reviews.map((r: any) => ({ userId: r.userId, vote: r.vote }))
    const existingIndex = reviews.findIndex((r: any) => r.userId.toString() === token.id)
    if (existingIndex >= 0) {
      reviews[existingIndex].vote = vote
    } else {
      reviews.push({ userId: token.id, vote })
    }

    const applicant = await Applicant.findOne({ issueId, status: 'accepted' }).lean()
    const authorId = issue?.author?.toString()

    const authorApproved = !!authorId && reviews.some((r: any) => r.userId.toString() === authorId && r.vote === 'approve')
    const anyDenied = !!authorId && reviews.some((r: any) => r.userId.toString() === authorId && r.vote === 'deny')
    const newStatus = authorApproved ? 'approved' : anyDenied ? 'denied' : 'pending'

    if (newStatus === 'approved') {
      const claimed = await Issue.findOneAndUpdate(
        { _id: issueId, 'completion.status': 'pending' },
        { $set: { 'completion.status': 'approved', 'completion.reviews': reviews } }
      )
      if (!claimed) {
        const current = await Issue.findById(issueId).populate('images').populate('completion.images').lean() as any
        return c.json({ completion: serializeCompletion(current.completion, issueId) })
      }

      try {
        await settleIssue(issueId)
        await Issue.findByIdAndUpdate(issueId, { $set: { status: 'completed' } })
      } catch (err) {
        console.error('[commission/review] settleIssue failed:', err)
      }

      if (rating > 0 && applicant) {
        const commissionId = (claimed as any)?.completion?._id
        if (commissionId) {
          await Rating.findOneAndUpdate(
            { commissionId, raterId: token.id },
            { issueId, commissionId, raterId: token.id, workerId: (applicant as any).userId, score: rating },
            { upsert: true }
          ).catch((err: any) => console.warn('[commission/review] rating upsert failed:', err?.message))
        }
      }
    } else {
      await Issue.findOneAndUpdate(
        { _id: issueId },
        { $set: { 'completion.status': newStatus, 'completion.reviews': reviews } }
      )
      if (newStatus === 'denied' && applicant) {
        await Applicant.findByIdAndUpdate((applicant as any)._id, { completionDeadline: midnightFollowingDay() })
        const eligibleCount = await Applicant.countDocuments({
          issueId, status: 'pending', bidAmount: { $exists: true, $ne: null },
        })
        if (eligibleCount === 0) {
          releasePledgeHolds(issueId).catch((err) => console.error('[commission/review] releasePledgeHolds failed:', err))
        }
      }
    }

    const updatedIssue = await Issue.findById(issueId)
      .populate({ path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } })
      .populate('images')
      .populate('completion.images')
      .lean() as any

    const serializedCompletion = serializeCompletion(updatedIssue.completion, issueId)

    let serializedNeed = null
    if (newStatus === 'approved' && updatedIssue) {
      const [p, a] = await Promise.all([
        Pledge.find({ issueId }).populate(USER_WITH_AVATAR_POPULATE).lean(),
        Applicant.find({ issueId }).populate(APPLICANT_USER_POPULATE).lean(),
      ])
      serializedNeed = serializeIssue({ ...updatedIssue, pledged: p, applicants: a })
    }

    emitIssueCompletionReviewed({
      issueId,
      completion: serializedCompletion,
      ...(serializedNeed ? { issue: serializedNeed } : {}),
    }).catch((err: any) => console.warn('[socket]', err?.message ?? err))

    return c.json({
      completion: serializedCompletion,
      ...(serializedNeed ? { issue: serializedNeed } : {}),
    })
  } catch (err) {
    console.error('[commission/review POST]', err)
    return c.json({ error: 'Failed to submit review' }, 500)
  }
})

// PATCH /api/mobile/issues/:id/complete — manual settlement trigger
sub.patch('/api/mobile/issues/:id/complete', authMiddleware, async (c) => {
  const token = c.get('token')
  const id = c.req.param('id')
  if (!isValidObjectId(id)) return c.json({ error: 'Invalid issue ID' }, 400)

  try {
    await connectToDatabase()
    const need = await Issue.findById(id)
    if (!need) return c.json({ error: 'Issue not found' }, 404)

    const isAuthor = need.author.toString() === token.id
    const isAdmin = token.role === 'admin'
    if (!isAuthor && !isAdmin) return c.json({ error: 'Forbidden' }, 403)

    if (need.status !== 'completed') await settleIssue(id)

    const updatedIssue = await Issue.findById(id)
      .populate({ path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } })
      .populate('images')
      .populate('completion.images')
      .lean() as any

    const [pledges, applicants, acceptedApplicant] = await Promise.all([
      Pledge.find({ issueId: id }).populate(USER_WITH_AVATAR_POPULATE).lean(),
      Applicant.find({ issueId: id }).lean(),
      Applicant.findOne({ issueId: id, status: 'accepted' }).lean() as any,
    ])

    const serializedIssue = serializeIssue({ ...updatedIssue, pledged: pledges, applicants })

    if (updatedIssue?.completion) {
      emitIssueCompletionReviewed({
        issueId: id,
        completion: serializeCompletion(updatedIssue.completion, id),
        issue: serializedIssue,
      }).catch((err: any) => console.warn('[socket]', err?.message ?? err))
    }

    return c.json({ issue: serializedIssue })
  } catch (err: any) {
    console.error('[mobile/issues/complete PATCH]', err)
    return c.json({ error: err?.message ?? 'Failed to complete issue' }, 500)
  }
})

export default sub
