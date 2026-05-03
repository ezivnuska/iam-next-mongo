// app/lib/mobile/settleIssue.ts
// Captures authorized pledge funds and transfers them to the accepted applicant.
// Called automatically when completion evidence is approved by all reviewers.

import stripe from '@/app/lib/stripe'
import { connectToDatabase } from '@/app/lib/mongoose'
import Issue from '@/app/lib/models/issue'
import Pledge from '@/app/lib/models/pledge'
import Applicant from '@/app/lib/models/applicant'
import UserModel from '@/app/lib/models/user'

export async function settleIssue(issueId: string): Promise<void> {
  await connectToDatabase()
  const issue = await Issue.findById(issueId)
  if (!issue || issue.status === 'completed') return

  const acceptedApplicant = await Applicant.findOne({ issueId, status: 'accepted' }).lean() as any
  if (!acceptedApplicant) throw new Error('No accepted applicant')

  const applicantUser = await UserModel.findById(acceptedApplicant.userId).lean() as any
  if (!applicantUser?.stripeAccountId) throw new Error('Applicant has no payout account')

  // Deny voters' PIs were already cancelled at acceptance time — capture everything remaining
  const pledges = await Pledge.find({
    issueId,
    stripePaymentIntentId: { $exists: true, $ne: null },
  }).lean() as any[]

  const captureResults = await Promise.allSettled(
    pledges.map((p) => stripe.paymentIntents.capture(p.stripePaymentIntentId))
  )

  // Transfer per captured PI using source_transaction — no platform balance required
  await Promise.allSettled(
    captureResults.map(async (result, i) => {
      const pledge = pledges[i]

      if (result.status !== 'fulfilled') {
        console.error('[settleIssue] capture failed for pledge', pledge._id, (result as PromiseRejectedResult).reason)
        try {
          await stripe.paymentIntents.cancel(pledge.stripePaymentIntentId)
        } catch (err: any) {
          console.error('[settleIssue] failed to cancel uncaptured PI', pledge.stripePaymentIntentId, err?.message)
        }
        return
      }

      const chargeId = result.value.latest_charge as string
      if (!chargeId) {
        console.error('[settleIssue] captured PI has no charge', pledge.stripePaymentIntentId)
        return
      }

      try {
        await stripe.transfers.create({
          amount: pledge.amount * 100,
          currency: 'usd',
          destination: applicantUser.stripeAccountId,
          source_transaction: chargeId,
          description: `Payment for issue ${issueId}`,
        })
      } catch (err: any) {
        console.error('[settleIssue] transfer failed for pledge', pledge._id, err?.message)
      }
    })
  )

  issue.status = 'completed'
  await issue.save()
}
