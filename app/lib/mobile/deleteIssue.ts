// app/lib/mobile/deleteIssue.ts
// Shared cleanup for issue deletion: releases held pledge funds, removes all
// related DB records, and deletes S3 assets.
// Used by both the author/admin DELETE route and the admin flag-approval path.

if (typeof window !== 'undefined') throw new Error('Server-only module')

import Issue from '@/app/lib/models/issue'
import Pledge from '@/app/lib/models/pledge'
import Fee from '@/app/lib/models/fee'
import Applicant from '@/app/lib/models/applicant'
import Rating from '@/app/lib/models/rating'
import ImageModel from '@/app/lib/models/image'
import stripe from '@/app/lib/stripe'
import { releasePledgeHolds } from '@/app/lib/mobile/pledgePayments'
import { deleteS3File } from '@/app/lib/aws/s3'

export async function deleteIssueWithCleanup(issueId: string): Promise<void> {
  const issue = await Issue.findById(issueId).lean() as any
  if (!issue) return

  if (issue.status === 'completed')
    throw new Error(`Cannot delete completed issue ${issueId} — payment has already been settled`)

  // Refund the creation fee before removing DB records
  const fee = await Fee.findOne({ issueId }).lean() as any
  if (fee?.stripePaymentIntentId) {
    try {
      await stripe.refunds.create({ payment_intent: fee.stripePaymentIntentId })
    } catch (err: any) {
      if (err?.code !== 'charge_already_refunded')
        console.error(`[deleteIssueWithCleanup] fee refund failed for issue ${issueId}:`, err?.message ?? err)
    }
  }

  // Release Stripe holds on pledges before removing DB records
  await releasePledgeHolds(issueId)

  const completionImageIds = issue.completion?.images ?? []
  const issueImageIds      = issue.images ?? []
  const reportImageIds     = (issue.reports ?? []).map((r: any) => r.imageId).filter(Boolean)
  const allImageIds        = [...completionImageIds, ...issueImageIds, ...reportImageIds]

  const [completionImages, issueImages, reportImages] = await Promise.all([
    completionImageIds.length > 0 ? ImageModel.find({ _id: { $in: completionImageIds } }).lean() : Promise.resolve([]),
    issueImageIds.length     > 0 ? ImageModel.find({ _id: { $in: issueImageIds }     }).lean() : Promise.resolve([]),
    reportImageIds.length    > 0 ? ImageModel.find({ _id: { $in: reportImageIds }    }).lean() : Promise.resolve([]),
  ])

  await Promise.all([
    Issue.findByIdAndDelete(issueId),
    Pledge.deleteMany({ issueId }),
    Fee.deleteMany({ issueId }),
    Applicant.deleteMany({ issueId }),
    Rating.deleteMany({ issueId }),
    allImageIds.length > 0 ? ImageModel.deleteMany({ _id: { $in: allImageIds } }) : Promise.resolve(),
  ])

  const allImages = [
    ...(completionImages as any[]),
    ...(issueImages as any[]),
    ...(reportImages as any[]),
  ]
  await Promise.allSettled(
    allImages.flatMap((img: any) =>
      (img.variants ?? [])
        .filter((v: any) => v.url)
        .map((v: any) => {
          const key = v.url.split(
            `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`
          )[1]
          return key ? deleteS3File(key) : Promise.resolve()
        })
    )
  )
}
