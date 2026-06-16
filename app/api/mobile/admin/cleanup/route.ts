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
import Rating from '@/app/lib/models/rating'
import stripe from '@/app/lib/stripe'

export const POST = withAuth(async (req, token) => {
  if (token.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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

    if (candidateIds.length === 0) return NextResponse.json({ deleted: { pledges: 0, fees: 0, applicants: 0, ratings: 0 } })

    const existingIssues = await Issue.find({ _id: { $in: candidateIds } }).select('_id').lean()
    const existingIds = new Set(existingIssues.map((i: any) => i._id.toString()))
    const orphanIds = candidateIds.filter((id) => !existingIds.has(id))

    if (orphanIds.length === 0) return NextResponse.json({ deleted: { pledges: 0, fees: 0, applicants: 0, ratings: 0 } })

    // Stripe cleanup for orphaned pledges
    const pledgesWithStripe = await Pledge.find({
      issueId: { $in: orphanIds },
      stripePaymentIntentId: { $exists: true, $ne: null },
    }).lean()

    await Promise.allSettled(
      (pledgesWithStripe as any[]).map(async (p) => {
        try {
          await stripe.refunds.create({ payment_intent: p.stripePaymentIntentId })
        } catch (err: any) {
          if (err?.code !== 'charge_already_refunded') {
            console.error(`[admin/cleanup] Failed to refund pledge PI ${p.stripePaymentIntentId}:`, err)
          }
        }
      })
    )

    const [pledgeResult, feeResult, applicantResult, ratingResult] = await Promise.all([
      Pledge.deleteMany({ issueId: { $in: orphanIds } }),
      Fee.deleteMany({ issueId: { $in: orphanIds } }),
      Applicant.deleteMany({ issueId: { $in: orphanIds } }),
      Rating.deleteMany({ issueId: { $in: orphanIds } }),
    ])

    return NextResponse.json({
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
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
  }
})
