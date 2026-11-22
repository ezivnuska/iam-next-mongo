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
  type LeanUser = { stripeCustomerId?: string; stripeDefaultPaymentMethodId?: string }
  const user = await UserModel.findById(userId).lean() as LeanUser | null
  if (!user?.stripeCustomerId || !user?.stripeDefaultPaymentMethodId) {
    throw Object.assign(new Error('Payment method required'), { code: 'NO_PAYMENT_METHOD' })
  }

  const pledge = await Pledge.create({ userId, issueId, amount })
  return pledge
}
