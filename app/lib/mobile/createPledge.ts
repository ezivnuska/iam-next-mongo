// app/lib/mobile/createPledge.ts
// Shared utility: create a pledge + authorize a Stripe PaymentIntent

import stripe from '@/app/lib/stripe'
import Pledge from '@/app/lib/models/pledge'
import UserModel from '@/app/lib/models/user'

export async function createPledgeWithPaymentIntent(
  userId: string,
  needId: string,
  amount: number
) {
  const user = await UserModel.findById(userId).lean() as any
  if (!user?.stripeCustomerId || !user?.stripeDefaultPaymentMethodId) {
    const err = new Error('Payment method required') as any
    err.code = 'NO_PAYMENT_METHOD'
    throw err
  }

  // Authorize (but do not capture) a PaymentIntent for the pledge amount
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // cents
    currency: 'usd',
    customer: user.stripeCustomerId,
    payment_method: user.stripeDefaultPaymentMethodId,
    capture_method: 'manual',
    confirm: true,
    off_session: true,
  })

  const pledge = await Pledge.create({
    userId,
    needId,
    amount,
    stripePaymentIntentId: paymentIntent.id,
  })

  return pledge
}
