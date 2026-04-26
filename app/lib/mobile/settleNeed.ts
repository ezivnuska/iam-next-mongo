// app/lib/mobile/settleNeed.ts
// Captures authorized pledge funds and transfers them to the accepted applicant.
// Called automatically when completion evidence is approved by all reviewers.

import stripe from '@/app/lib/stripe'
import Need from '@/app/lib/models/need'
import Pledge from '@/app/lib/models/pledge'
import Applicant from '@/app/lib/models/applicant'
import UserModel from '@/app/lib/models/user'

export async function settleNeed(needId: string): Promise<void> {
  const need = await Need.findById(needId)
  if (!need || need.status === 'completed') return

  const acceptedApplicant = await Applicant.findOne({ needId, status: 'accepted' }).lean() as any
  if (!acceptedApplicant) throw new Error('No accepted applicant')

  const applicantUser = await UserModel.findById(acceptedApplicant.userId).lean() as any
  if (!applicantUser?.stripeAccountId) throw new Error('Applicant has no payout account')

  const confirmingUserIds = new Set(
    acceptedApplicant.votes
      .filter((v: any) => v.vote === 'confirm')
      .map((v: any) => v.userId.toString())
  )

  const allPledges = await Pledge.find({
    needId,
    stripePaymentIntentId: { $exists: true, $ne: null },
  }).lean() as any[]

  const confirmingPledges = allPledges.filter((p) =>
    confirmingUserIds.has(p.userId.toString())
  )

  const captureResults = await Promise.allSettled(
    confirmingPledges.map((p) => stripe.paymentIntents.capture(p.stripePaymentIntentId))
  )

  // Transfer per captured PI using source_transaction — no platform balance required
  await Promise.allSettled(
    captureResults.map(async (result, i) => {
      const pledge = confirmingPledges[i]

      if (result.status !== 'fulfilled') {
        console.error('[settleNeed] capture failed for pledge', pledge._id, (result as PromiseRejectedResult).reason)
        try {
          await stripe.paymentIntents.cancel(pledge.stripePaymentIntentId)
        } catch (err: any) {
          console.error('[settleNeed] failed to cancel uncaptured PI', pledge.stripePaymentIntentId, err?.message)
        }
        return
      }

      const chargeId = result.value.latest_charge as string
      if (!chargeId) {
        console.error('[settleNeed] captured PI has no charge', pledge.stripePaymentIntentId)
        return
      }

      try {
        await stripe.transfers.create({
          amount: pledge.amount * 100,
          currency: 'usd',
          destination: applicantUser.stripeAccountId,
          source_transaction: chargeId,
          description: `Payment for need ${needId}`,
        })
      } catch (err: any) {
        console.error('[settleNeed] transfer failed for pledge', pledge._id, err?.message)
      }
    })
  )

  need.status = 'completed'
  await need.save()
}
