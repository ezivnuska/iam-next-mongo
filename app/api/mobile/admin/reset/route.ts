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
          await stripe.refunds.create({ payment_intent: p.stripePaymentIntentId })
        } catch (err: any) {
          if (err?.code !== 'charge_already_refunded') {
            console.error(`[admin/reset] Failed to refund pledge PI ${p.stripePaymentIntentId}:`, err)
          }
        }
      })
    )

    // Collect completion images from issues before deleting them
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

    return NextResponse.json({
      deleted: {
        issues: issueResult.deletedCount,
        pledges: pledgeResult.deletedCount,
        fees: feeResult.deletedCount,
        applicants: applicantResult.deletedCount,
        ratings: ratingResult.deletedCount,
        completionImages: completionImageIds.length,
      },
    })
  } catch (err) {
    console.error('[admin/reset POST]', err)
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 })
  }
})
