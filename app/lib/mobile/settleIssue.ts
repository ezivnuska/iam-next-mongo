// app/lib/mobile/settleIssue.ts
// Captures authorized pledge funds and transfers them to the accepted applicant.
// Called automatically when completion evidence is approved by all reviewers.

import stripe from '@/app/lib/stripe'
import { connectToDatabase } from '@/app/lib/mongoose'
import Issue from '@/app/lib/models/issue'
import Pledge from '@/app/lib/models/pledge'
import Applicant from '@/app/lib/models/applicant'
import UserModel from '@/app/lib/models/user'

const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') && process.env.NODE_ENV !== 'production'

async function ensureTransfersCapability(accountId: string): Promise<void> {
  const account = await stripe.accounts.retrieve(accountId)
  if (account.capabilities?.transfers === 'active') return

  if (!isTestMode) {
    throw new Error(`Destination account ${accountId} does not have transfers capability active`)
  }

  // Test mode: push the required identity fields to trigger capability activation
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

  // Poll up to 5 s for the capability to activate
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 500))
    const updated = await stripe.accounts.retrieve(accountId)
    if (updated.capabilities?.transfers === 'active') return
  }

  throw new Error(`Transfers capability still not active on account ${accountId} after update`)
}

export async function settleIssue(issueId: string): Promise<void> {
  await connectToDatabase()
  const issue = await Issue.findById(issueId)
  if (!issue || issue.status === 'completed') return

  const acceptedApplicant = await Applicant.findOne({ issueId, status: 'accepted' }).lean() as any
  if (!acceptedApplicant) throw new Error('No accepted applicant')

  const applicantUser = await UserModel.findById(acceptedApplicant.userId).lean() as any
  if (!applicantUser?.stripeAccountId) throw new Error('Applicant has no payout account')

  // Ensure the destination account can receive transfers before capturing any funds
  await ensureTransfersCapability(applicantUser.stripeAccountId)

  // Deny voters' PIs were already cancelled at acceptance time — capture everything remaining
  const pledges = await Pledge.find({
    issueId,
    stripePaymentIntentId: { $exists: true, $ne: null },
  }).lean() as any[]

  const captureResults = await Promise.allSettled(
    pledges.map((p) => stripe.paymentIntents.capture(p.stripePaymentIntentId))
  )

  let successfulCaptures = 0
  const transferErrors: string[] = []

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

      successfulCaptures++
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
        // Funds were captured but transfer failed — money is stuck on the platform account
        const msg = `Transfer failed for pledge ${pledge._id} (charge ${chargeId}): ${err?.message}`
        console.error('[settleIssue]', msg)
        transferErrors.push(msg)
      }
    })
  )

  if (pledges.length > 0 && successfulCaptures === 0) {
    throw new Error('All pledge captures failed — settlement aborted, issue remains open')
  }

  if (transferErrors.length > 0) {
    throw new Error(`Settlement incomplete — captured funds not transferred: ${transferErrors.join('; ')}`)
  }

  issue.status = 'completed'
  await issue.save()
}
