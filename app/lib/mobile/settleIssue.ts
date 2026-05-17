// app/lib/mobile/settleIssue.ts
// Transfers already-captured pledge funds to the accepted applicant.
// Pledges are charged at applicant acceptance; settlement only handles the transfers.

import stripe from '@/app/lib/stripe'
import { connectToDatabase } from '@/app/lib/mongoose'
import Pledge from '@/app/lib/models/pledge'
import Applicant from '@/app/lib/models/applicant'
import UserModel from '@/app/lib/models/user'

const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')

async function ensureTransfersCapability(accountId: string): Promise<void> {
  const account = await stripe.accounts.retrieve(accountId)
  if (account.capabilities?.transfers === 'active') return

  if (!isTestMode) {
    throw new Error(`Destination account ${accountId} does not have transfers capability active`)
  }

  await stripe.accounts.update(accountId, {
    business_profile: { url: process.env.NEXT_PUBLIC_BASE_URL ?? 'https://iameric.me', mcc: '7299' },
    individual: {
      first_name: (account as any).individual?.first_name ?? 'Test',
      last_name:  (account as any).individual?.last_name  ?? 'User',
      dob:        (account as any).individual?.dob        ?? { day: 1, month: 1, year: 1990 },
      address:    (account as any).individual?.address    ?? { line1: '123 Main St', city: 'San Francisco', state: 'CA', postal_code: '94111', country: 'US' },
      ssn_last_4: '0000',
    },
  } as any)

  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 500))
    const updated = await stripe.accounts.retrieve(accountId)
    if (updated.capabilities?.transfers === 'active') return
  }

  throw new Error(`Transfers capability still not active on account ${accountId} after update`)
}

export async function settleIssue(issueId: string): Promise<void> {
  await connectToDatabase()

  const acceptedApplicant = await Applicant.findOne({ issueId, status: 'accepted' }).lean() as any
  if (!acceptedApplicant) throw new Error('No accepted applicant')

  const applicantUser = await UserModel.findById(acceptedApplicant.userId).lean() as any
  if (!applicantUser?.stripeAccountId) throw new Error('Applicant has no payout account')

  await ensureTransfersCapability(applicantUser.stripeAccountId)

  // Pledges were already charged at acceptance — retrieve charge IDs and transfer
  const pledges = await Pledge.find({
    issueId,
    stripePaymentIntentId: { $exists: true, $ne: null },
  }).lean() as any[]

  if (pledges.length === 0) return

  const transferErrors: string[] = []

  await Promise.allSettled(
    pledges.map(async (pledge) => {
      try {
        const pi = await stripe.paymentIntents.retrieve(pledge.stripePaymentIntentId)
        const chargeId = pi.latest_charge as string
        if (!chargeId) {
          console.error('[settleIssue] no charge on PI', pledge.stripePaymentIntentId)
          return
        }
        await stripe.transfers.create({
          amount: pledge.amount * 100,
          currency: 'usd',
          destination: applicantUser.stripeAccountId,
          source_transaction: chargeId,
          description: `Payment for issue ${issueId}`,
        })
      } catch (err: any) {
        const msg = `Transfer failed for pledge ${pledge._id}: ${err?.message}`
        console.error('[settleIssue]', msg)
        transferErrors.push(msg)
      }
    })
  )

  if (transferErrors.length > 0) {
    throw new Error(`Settlement incomplete — transfers failed: ${transferErrors.join('; ')}`)
  }
}
