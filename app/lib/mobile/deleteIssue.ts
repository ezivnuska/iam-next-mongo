// app/lib/mobile/deleteIssue.ts
// Shared cleanup for issue deletion: releases held pledge funds, removes all
// related DB records, and deletes S3 assets.
// Used by both the author/admin DELETE route and the admin flag-approval path.

if (typeof window !== 'undefined') throw new Error('Server-only module')

import Issue from '@/app/lib/models/issue'
import Completion from '@/app/lib/models/completion'
import Pledge from '@/app/lib/models/pledge'
import Fee from '@/app/lib/models/fee'
import Applicant from '@/app/lib/models/applicant'
import Rating from '@/app/lib/models/rating'
import ImageModel from '@/app/lib/models/image'
import stripe from '@/app/lib/stripe'
import { releasePledgeHolds } from '@/app/lib/mobile/pledgePayments'
import { deleteS3File } from '@/app/lib/aws/s3'

export async function deleteIssueWithCleanup(issueId: string, force = false): Promise<void> {
  type LeanDoc = Record<string, unknown>
  const issue = await Issue.findById(issueId).lean() as LeanDoc | null
  if (!issue) return

  if (!force && issue['status'] === 'completed')
    throw new Error(`Cannot delete completed issue ${issueId} — payment has already been settled`)

  // Refund the creation fee before removing DB records
  const fee = await Fee.findOne({ issueId }).lean() as LeanDoc | null
  if (fee?.stripePaymentIntentId) {
    try {
      await stripe.refunds.create({ payment_intent: fee.stripePaymentIntentId as string })
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e?.code !== 'charge_already_refunded')
        console.error(`[deleteIssueWithCleanup] fee refund failed for issue ${issueId}:`, e?.message ?? err)
    }
  }

  // Release Stripe holds on pledges before removing DB records
  await releasePledgeHolds(issueId)

  const completionDocs  = await Completion.find({ issueId }).select('images').lean() as LeanDoc[]
  const applicantDocs   = await Applicant.find({ issueId }).select('startImageId').lean() as LeanDoc[]
  const completionImageIds = completionDocs.flatMap(c => (c['images'] as unknown[]) ?? [])
  const applicantImageIds  = applicantDocs.map(a => a['startImageId']).filter(Boolean)
  const issueImageIds      = (issue['images'] as unknown[]) ?? []
  const reportImageIds     = ((issue['reports'] as LeanDoc[]) ?? []).map(r => r['imageId']).filter(Boolean)
  const allImageIds        = [...completionImageIds, ...applicantImageIds, ...issueImageIds, ...reportImageIds]

  const [completionImages, applicantImages, issueImages, reportImages] = await Promise.all([
    completionImageIds.length > 0 ? ImageModel.find({ _id: { $in: completionImageIds } }).lean() : Promise.resolve([]),
    applicantImageIds.length  > 0 ? ImageModel.find({ _id: { $in: applicantImageIds }  }).lean() : Promise.resolve([]),
    issueImageIds.length      > 0 ? ImageModel.find({ _id: { $in: issueImageIds }      }).lean() : Promise.resolve([]),
    reportImageIds.length     > 0 ? ImageModel.find({ _id: { $in: reportImageIds }     }).lean() : Promise.resolve([]),
  ])

  await Promise.all([
    Issue.findByIdAndDelete(issueId),
    Completion.deleteMany({ issueId }),
    Pledge.deleteMany({ issueId }),
    Fee.deleteMany({ issueId }),
    Applicant.deleteMany({ issueId }),
    Rating.deleteMany({ issueId }),
    allImageIds.length > 0 ? ImageModel.deleteMany({ _id: { $in: allImageIds } }) : Promise.resolve(),
  ])

  type LeanImage = { variants?: Array<{ url?: string }> }
  const allImages = [
    ...(completionImages as LeanImage[]),
    ...(applicantImages as LeanImage[]),
    ...(issueImages as LeanImage[]),
    ...(reportImages as LeanImage[]),
  ]
  await Promise.allSettled(
    allImages.flatMap(img =>
      (img.variants ?? [])
        .filter((v): v is { url: string } => !!v.url)
        .map(v => {
          const key = v.url.split(
            `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`
          )[1]
          return key ? deleteS3File(key) : Promise.resolve()
        })
    )
  )
}
