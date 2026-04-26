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

  const failedPledges: typeof confirmingPledges = []
  const totalCapturedCents = captureResults.reduce((sum, result, i) => {
    if (result.status === 'fulfilled') return sum + confirmingPledges[i].amount * 100
    console.error('[settleNeed] capture failed for pledge', confirmingPledges[i]._id, (result as PromiseRejectedResult).reason)
    failedPledges.push(confirmingPledges[i])
    return sum
  }, 0)

  // Cancel any PIs that failed to capture so funds are released immediately
  if (failedPledges.length > 0) {
    await Promise.allSettled(
      failedPledges.map(async (p) => {
        try {
          await stripe.paymentIntents.cancel(p.stripePaymentIntentId)
        } catch (err: any) {
          console.error('[settleNeed] failed to cancel uncaptured PI', p.stripePaymentIntentId, err?.message)
        }
      })
    )
  }

  if (totalCapturedCents > 0) {
    await stripe.transfers.create({
      amount: totalCapturedCents,
      currency: 'usd',
      destination: applicantUser.stripeAccountId,
      description: `Payment for need ${needId}`,
    })
  }

  need.status = 'completed'
  await need.save()
}
