// app/lib/mobile/createFee.ts
// Creates the non-refundable issue creation fee and authorizes a Stripe PaymentIntent.
// The fee is captured to the platform account on issue completion or deletion.

import stripe from '@/app/lib/stripe'
import Fee from '@/app/lib/models/fee'
import UserModel from '@/app/lib/models/user'

export async function createIssueFee(
  userId: string,
  issueId: string,
  amount: number
) {
  const user = await UserModel.findById(userId).lean() as any
  if (!user?.stripeCustomerId || !user?.stripeDefaultPaymentMethodId) {
    const err = new Error('Payment method required') as any
    err.code = 'NO_PAYMENT_METHOD'
    throw err
  }

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100),
    currency: 'usd',
    customer: user.stripeCustomerId,
    payment_method: user.stripeDefaultPaymentMethodId,
    capture_method: 'automatic',
    confirm: true,
    off_session: true,
  })

  const fee = await Fee.create({
    userId,
    issueId,
    amount,
    stripePaymentIntentId: paymentIntent.id,
  })

  return fee
}
