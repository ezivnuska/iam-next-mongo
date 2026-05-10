// app/api/mobile/admin/reset/route.ts
// POST — delete ALL issues, pledges, applicants, commissions, ratings, and associated images.
//        Handles Stripe refunds/cancellations before deleting pledges.
//        Admin only. This is a full data reset — use with caution.

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

    // Capture all fees to the platform account (non-refundable)
    const feesWithStripe = await Fee.find({
      stripePaymentIntentId: { $exists: true, $ne: null },
    }).lean()

    await Promise.allSettled(
      (feesWithStripe as any[]).map(async (f) => {
        try {
          const pi = await stripe.paymentIntents.retrieve(f.stripePaymentIntentId)
          if (pi.status === 'requires_capture') await stripe.paymentIntents.capture(f.stripePaymentIntentId)
        } catch (err) {
          console.error(`[admin/reset] Failed to capture fee PI ${f.stripePaymentIntentId}:`, err)
        }
      })
    )

    // Cancel or refund contributor pledges
    const pledgesWithStripe = await Pledge.find({
      stripePaymentIntentId: { $exists: true, $ne: null },
    }).lean()

    await Promise.allSettled(
      (pledgesWithStripe as any[]).map(async (p) => {
        try {
          const pi = await stripe.paymentIntents.retrieve(p.stripePaymentIntentId)
          if (pi.status === 'requires_capture') await stripe.paymentIntents.cancel(p.stripePaymentIntentId)
          else if (pi.status === 'succeeded') await stripe.refunds.create({ payment_intent: p.stripePaymentIntentId })
        } catch (err) {
          console.error(`[admin/reset] Failed to release pledge PI ${p.stripePaymentIntentId}:`, err)
        }
      })
    )

    // Collect all commission images for S3 cleanup
    const allCommissions = await Commission.find({}).select('images').lean()
    const commissionImageIds = (allCommissions as any[]).flatMap((c) => c.images ?? [])

    const commissionImages = commissionImageIds.length > 0
      ? await ImageModel.find({ _id: { $in: commissionImageIds } }).lean()
      : []

    const [issueResult, pledgeResult, feeResult, applicantResult, commissionResult, ratingResult] = await Promise.all([
      Issue.deleteMany({}),
      Pledge.deleteMany({}),
      Fee.deleteMany({}),
      Applicant.deleteMany({}),
      Commission.deleteMany({}),
      Rating.deleteMany({}),
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
        issues: issueResult.deletedCount,
        pledges: pledgeResult.deletedCount,
        fees: feeResult.deletedCount,
        applicants: applicantResult.deletedCount,
        commissions: commissionResult.deletedCount,
        ratings: ratingResult.deletedCount,
        commissionImages: commissionImageIds.length,
      },
    })
  } catch (err) {
    console.error('[admin/reset POST]', err)
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 })
  }
})
