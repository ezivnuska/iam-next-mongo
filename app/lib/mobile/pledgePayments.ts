// app/lib/mobile/pledgePayments.ts
// Stripe PaymentIntent lifecycle for pledge holds.
//
// Design: pledges are held (manual-capture PI) when an applicant is accepted,
// captured and transferred on approval (settleIssue), and cancelled on deletion.
// Denial keeps holds intact so the worker can resubmit.

if (typeof window !== 'undefined') throw new Error('Server-only module')

import stripe from '@/app/lib/stripe'
import Pledge from '@/app/lib/models/pledge'
import UserModel from '@/app/lib/models/user'

// Called in tryAutoAccept immediately after an applicant is accepted.
// Creates a manual-capture hold on every pledge that doesn't yet have a PI.
// Best-effort: individual failures are logged but don't block acceptance.
export async function holdPledges(issueId: string): Promise<void> {
  const pledges = await Pledge.find({
    issueId,
    stripePaymentIntentId: { $exists: false },
  }).lean() as any[]

  if (pledges.length === 0) return

  await Promise.allSettled(
    pledges.map(async (pledge) => {
      try {
        const user = await UserModel.findById(pledge.userId)
          .select('stripeCustomerId stripeDefaultPaymentMethodId').lean() as any
        if (!user?.stripeCustomerId || !user?.stripeDefaultPaymentMethodId) {
          console.warn(`[holdPledges] pledge ${pledge._id} owner has no payment method — skipping`)
          return
        }

        const pi = await stripe.paymentIntents.create(
          {
            amount: Math.round(pledge.amount * 100),
            currency: 'usd',
            customer: user.stripeCustomerId,
            payment_method: user.stripeDefaultPaymentMethodId,
            capture_method: 'manual',
            confirm: true,
            off_session: true,
          },
          { idempotencyKey: `hold-pledge-${pledge._id}` }
        )

        await Pledge.findByIdAndUpdate(pledge._id, { stripePaymentIntentId: pi.id })
      } catch (err: any) {
        console.error(`[holdPledges] failed for pledge ${pledge._id}:`, err?.message ?? err)
      }
    })
  )
}

// Called when an issue is permanently removed (admin delete or flag approval).
// Cancels uncaptured holds; refunds anything that was already captured.
// Best-effort: individual failures are logged but don't block the delete.
export async function releasePledgeHolds(issueId: string): Promise<void> {
  const pledges = await Pledge.find({
    issueId,
    stripePaymentIntentId: { $exists: true, $ne: null },
  }).lean() as any[]

  if (pledges.length === 0) return

  await Promise.allSettled(
    pledges.map(async (pledge) => {
      try {
        const pi = await stripe.paymentIntents.retrieve(pledge.stripePaymentIntentId)
        if (pi.status === 'requires_capture') {
          await stripe.paymentIntents.cancel(pledge.stripePaymentIntentId)
        } else if (pi.status === 'succeeded') {
          await stripe.refunds.create({ payment_intent: pledge.stripePaymentIntentId })
        }
        // canceled / requires_payment_method / etc. — nothing to do
      } catch (err: any) {
        if (err?.code !== 'charge_already_refunded')
          console.error(`[releasePledgeHolds] failed for pledge ${pledge._id}:`, err?.message ?? err)
      }
    })
  )
}
