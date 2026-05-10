// app/lib/mobile/createPledge.ts
// Records a pledge commitment. No Stripe charge is created here — pledges are
// charged immediately when the applicant accepts the work offer.

import Pledge from '@/app/lib/models/pledge'
import UserModel from '@/app/lib/models/user'

export async function createPledgeWithPaymentIntent(
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

  const pledge = await Pledge.create({ userId, issueId, amount })
  return pledge
}
