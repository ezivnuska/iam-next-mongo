// api/routes/mobile/admin/index.ts
// POST /api/mobile/admin/cleanup — orphan data cleanup (admin only)
// POST /api/mobile/admin/reset   — full data reset (admin only)
// GET  /api/mobile/admin/fees    — list all platform fees (admin only)

import { Hono } from 'hono'
import { authMiddleware, TokenPayload } from '../../../middleware/auth'
import { connectToDatabase } from '../../../../app/lib/mongoose'
import Issue from '../../../../app/lib/models/issue'
import Pledge from '../../../../app/lib/models/pledge'
import Fee from '../../../../app/lib/models/fee'
import Applicant from '../../../../app/lib/models/applicant'
import Rating from '../../../../app/lib/models/rating'
import ImageModel from '../../../../app/lib/models/image'
import stripeClient from '../../../../app/lib/stripe'
import { deleteS3File } from '../../../../app/lib/aws/s3'
import '../../../../app/lib/models/user'

const admin = new Hono<{ Variables: { token: TokenPayload } }>()

admin.post('/api/mobile/admin/cleanup', authMiddleware, async (c) => {
  const token = c.get('token')
  if (token.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)

  try {
    await connectToDatabase()

    const [allPledgeIssueIds, allFeeIssueIds, allApplicantIssueIds, allRatingIssueIds] = await Promise.all([
      Pledge.distinct('issueId'),
      Fee.distinct('issueId'),
      Applicant.distinct('issueId'),
      Rating.distinct('issueId'),
    ])

    const candidateIds = [
      ...new Set([
        ...allPledgeIssueIds.map((id: any) => id.toString()),
        ...allFeeIssueIds.map((id: any) => id.toString()),
        ...allApplicantIssueIds.map((id: any) => id.toString()),
        ...allRatingIssueIds.map((id: any) => id.toString()),
      ]),
    ]

    if (candidateIds.length === 0)
      return c.json({ deleted: { orphanIssueIds: [], pledges: 0, fees: 0, applicants: 0, ratings: 0 } })

    const existingIssues = await Issue.find({ _id: { $in: candidateIds } }).select('_id').lean()
    const existingIds = new Set(existingIssues.map((i: any) => i._id.toString()))
    const orphanIds = candidateIds.filter((id) => !existingIds.has(id))

    if (orphanIds.length === 0)
      return c.json({ deleted: { orphanIssueIds: [], pledges: 0, fees: 0, applicants: 0, ratings: 0 } })

    const pledgesWithStripe = await Pledge.find({
      issueId: { $in: orphanIds },
      stripePaymentIntentId: { $exists: true, $ne: null },
    }).lean()

    await Promise.allSettled(
      (pledgesWithStripe as any[]).map(async (p) => {
        try {
          const pi = await stripeClient.paymentIntents.retrieve(p.stripePaymentIntentId)
          if (pi.status === 'requires_capture') {
            await stripeClient.paymentIntents.cancel(p.stripePaymentIntentId)
          } else if (pi.status === 'succeeded') {
            await stripeClient.refunds.create({ payment_intent: p.stripePaymentIntentId })
          }
          // canceled or other terminal states — nothing to do
        } catch (err: any) {
          if (err?.code !== 'charge_already_refunded')
            console.error(`[admin/cleanup] Failed to reverse pledge PI ${p.stripePaymentIntentId}:`, err)
        }
      })
    )

    const [pledgeResult, feeResult, applicantResult, ratingResult] = await Promise.all([
      Pledge.deleteMany({ issueId: { $in: orphanIds } }),
      Fee.deleteMany({ issueId: { $in: orphanIds } }),
      Applicant.deleteMany({ issueId: { $in: orphanIds } }),
      Rating.deleteMany({ issueId: { $in: orphanIds } }),
    ])

    return c.json({
      deleted: {
        orphanIssueIds: orphanIds,
        pledges: pledgeResult.deletedCount,
        fees: feeResult.deletedCount,
        applicants: applicantResult.deletedCount,
        ratings: ratingResult.deletedCount,
      },
    })
  } catch (err) {
    console.error('[admin/cleanup POST]', err)
    return c.json({ error: 'Cleanup failed' }, 500)
  }
})

admin.post('/api/mobile/admin/reset', authMiddleware, async (c) => {
  const token = c.get('token')
  if (token.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)

  try {
    await connectToDatabase()

    const feesWithStripe = await Fee.find({ stripePaymentIntentId: { $exists: true, $ne: null } }).lean()
    await Promise.allSettled(
      (feesWithStripe as any[]).map(async (f) => {
        try {
          const pi = await stripeClient.paymentIntents.retrieve(f.stripePaymentIntentId)
          if (pi.status === 'requires_capture') await stripeClient.paymentIntents.capture(f.stripePaymentIntentId)
        } catch (err) {
          console.error(`[admin/reset] Failed to capture fee PI ${f.stripePaymentIntentId}:`, err)
        }
      })
    )

    const pledgesWithStripe = await Pledge.find({ stripePaymentIntentId: { $exists: true, $ne: null } }).lean()
    await Promise.allSettled(
      (pledgesWithStripe as any[]).map(async (p) => {
        try {
          const pi = await stripeClient.paymentIntents.retrieve(p.stripePaymentIntentId)
          if (pi.status === 'requires_capture') {
            await stripeClient.paymentIntents.cancel(p.stripePaymentIntentId)
          } else if (pi.status === 'succeeded') {
            await stripeClient.refunds.create({ payment_intent: p.stripePaymentIntentId })
          }
        } catch (err: any) {
          if (err?.code !== 'charge_already_refunded')
            console.error(`[admin/reset] Failed to reverse pledge PI ${p.stripePaymentIntentId}:`, err)
        }
      })
    )

    const issuesWithCompletion = await Issue.find(
      { 'completion.images': { $exists: true, $ne: [] } },
      { 'completion.images': 1 }
    ).lean() as any[]
    const completionImageIds = issuesWithCompletion.flatMap((n) => n.completion?.images ?? [])

    const completionImages = completionImageIds.length > 0
      ? await ImageModel.find({ _id: { $in: completionImageIds } }).lean()
      : []

    const [issueResult, pledgeResult, feeResult, applicantResult, ratingResult] = await Promise.all([
      Issue.deleteMany({}),
      Pledge.deleteMany({}),
      Fee.deleteMany({}),
      Applicant.deleteMany({}),
      Rating.deleteMany({}),
      completionImageIds.length > 0 ? ImageModel.deleteMany({ _id: { $in: completionImageIds } }) : Promise.resolve(),
    ])

    await Promise.allSettled(
      (completionImages as any[]).flatMap((img) =>
        (img.variants ?? [])
          .filter((v: any) => v.url)
          .map((v: any) => {
            const key = v.url.split(`https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`)[1]
            return key ? deleteS3File(key) : Promise.resolve()
          })
      )
    )

    return c.json({
      deleted: {
        issues: issueResult.deletedCount,
        pledges: pledgeResult.deletedCount,
        fees: feeResult.deletedCount,
        applicants: applicantResult.deletedCount,
        ratings: ratingResult.deletedCount,
        images: completionImageIds.length,
      },
    })
  } catch (err) {
    console.error('[admin/reset POST]', err)
    return c.json({ error: 'Reset failed' }, 500)
  }
})

admin.get('/api/mobile/admin/fees', authMiddleware, async (c) => {
  const token = c.get('token')
  if (token.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)

  try {
    await connectToDatabase()

    const rawFees = await Fee.find({})
      .sort({ createdAt: -1 })
      .populate({ path: 'userId', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } })
      .populate({ path: 'issueId', select: '_id issueType status' })
      .lean() as any[]

    const fees = rawFees.map((f) => {
      const issue = f.issueId as any
      const user = f.userId as any
      const issueStatus: string | null = issue?.status ?? null
      const feeStatus = issueStatus === 'open' ? 'pending' : 'captured'
      return {
        id: f._id.toString(),
        amount: f.amount,
        createdAt: f.createdAt,
        issueId: issue?._id?.toString() ?? null,
        issueType: issue?.issueType ?? null,
        issueStatus,
        feeStatus,
        userId: user?._id?.toString() ?? null,
        username: user?.username ?? null,
        avatar: user?.avatar
          ? { id: (user.avatar as any)._id.toString(), variants: (user.avatar as any).variants ?? [] }
          : null,
      }
    })

    const captured = fees.filter((f) => f.feeStatus === 'captured').length
    const pending = fees.filter((f) => f.feeStatus === 'pending').length
    const totalAmount = fees.reduce((sum, f) => sum + f.amount, 0)

    return c.json({
      summary: { count: fees.length, totalAmount, captured, pending },
      fees,
    })
  } catch (err) {
    console.error('[admin/fees GET]', err)
    return c.json({ error: 'Failed to load fees' }, 500)
  }
})

export default admin
