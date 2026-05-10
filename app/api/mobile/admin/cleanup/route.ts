// app/api/mobile/admin/cleanup/route.ts
// POST — delete all pledges, applicants, commissions, and ratings whose issueId no longer exists.
//        Admin only. Handles Stripe refunds/cancellations before deleting pledges.

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import Issue from '@/app/lib/models/issue'
import Pledge from '@/app/lib/models/pledge'
import Fee from '@/app/lib/models/fee'
import Applicant from '@/app/lib/models/applicant'
import Commission from '@/app/lib/models/commission'
import Rating from '@/app/lib/models/rating'
import ImageModel from '@/app/lib/models/image'
import stripe from '@/app/lib/stripe'
import { deleteS3File } from '@/app/lib/aws/s3'

export const POST = withAuth(async (req, token) => {
  if (token.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    await connectToDatabase()

    const [allPledgeIssueIds, allFeeIssueIds, allApplicantIssueIds, allCommissionIssueIds, allRatingIssueIds] = await Promise.all([
      Pledge.distinct('issueId'),
      Fee.distinct('issueId'),
      Applicant.distinct('issueId'),
      Commission.distinct('issueId'),
      Rating.distinct('issueId'),
    ])

    const candidateIds = [
      ...new Set([
        ...allPledgeIssueIds.map((id: any) => id.toString()),
        ...allFeeIssueIds.map((id: any) => id.toString()),
        ...allApplicantIssueIds.map((id: any) => id.toString()),
        ...allCommissionIssueIds.map((id: any) => id.toString()),
        ...allRatingIssueIds.map((id: any) => id.toString()),
      ]),
    ]

    if (candidateIds.length === 0) return NextResponse.json({ deleted: { pledges: 0, fees: 0, applicants: 0, commissions: 0, ratings: 0 } })

    const existingIssues = await Issue.find({ _id: { $in: candidateIds } }).select('_id').lean()
    const existingIds = new Set(existingIssues.map((i: any) => i._id.toString()))
    const orphanIds = candidateIds.filter((id) => !existingIds.has(id))

    if (orphanIds.length === 0) return NextResponse.json({ deleted: { pledges: 0, fees: 0, applicants: 0, commissions: 0, ratings: 0 } })

    // Stripe cleanup for orphaned pledges
    const pledgesWithStripe = await Pledge.find({
      issueId: { $in: orphanIds },
      stripePaymentIntentId: { $exists: true, $ne: null },
    }).lean()

    await Promise.allSettled(
      (pledgesWithStripe as any[]).map(async (p) => {
        try {
          const pi = await stripe.paymentIntents.retrieve(p.stripePaymentIntentId)
          if (pi.status === 'requires_capture') await stripe.paymentIntents.cancel(p.stripePaymentIntentId)
          else if (pi.status === 'succeeded') await stripe.refunds.create({ payment_intent: p.stripePaymentIntentId })
        } catch (err) {
          console.error(`[admin/cleanup] Failed to release PI ${p.stripePaymentIntentId}:`, err)
        }
      })
    )

    // Collect commission images for cleanup
    const orphanCommissions = await Commission.find({ issueId: { $in: orphanIds } }).select('images').lean()
    const commissionImageIds = (orphanCommissions as any[]).flatMap((c) => c.images ?? [])

    const commissionImages = commissionImageIds.length > 0
      ? await ImageModel.find({ _id: { $in: commissionImageIds } }).lean()
      : []

    const [pledgeResult, feeResult, applicantResult, commissionResult, ratingResult] = await Promise.all([
      Pledge.deleteMany({ issueId: { $in: orphanIds } }),
      Fee.deleteMany({ issueId: { $in: orphanIds } }),
      Applicant.deleteMany({ issueId: { $in: orphanIds } }),
      Commission.deleteMany({ issueId: { $in: orphanIds } }),
      Rating.deleteMany({ issueId: { $in: orphanIds } }),
      commissionImageIds.length > 0 ? ImageModel.deleteMany({ _id: { $in: commissionImageIds } }) : Promise.resolve(),
    ])

    await Promise.allSettled(
      (commissionImages as any[]).flatMap((img) =>
        (img.variants ?? [])
          .filter((v: any) => v.url)
          .map((v: any) => {
            const key = v.url.split(`https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`)[1]
            return key ? deleteS3File(key) : Promise.resolve()
          })
      )
    )

    return NextResponse.json({
      deleted: {
        orphanIssueIds: orphanIds,
        pledges: pledgeResult.deletedCount,
        fees: feeResult.deletedCount,
        applicants: applicantResult.deletedCount,
        commissions: commissionResult.deletedCount,
        ratings: ratingResult.deletedCount,
        commissionImages: commissionImageIds.length,
      },
    })
  } catch (err) {
    console.error('[admin/cleanup POST]', err)
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
})
