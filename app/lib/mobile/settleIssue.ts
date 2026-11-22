// app/lib/mobile/settleIssue.ts
// Transfers already-captured pledge funds to the accepted applicant.
// Pledges are charged at applicant acceptance; settlement only handles the transfers.

import stripe from '@/app/lib/stripe'
import { connectToDatabase } from '@/app/lib/mongoose'
import Pledge from '@/app/lib/models/pledge'
import Applicant from '@/app/lib/models/applicant'
import UserModel from '@/app/lib/models/user'

const isTestMode = process.env.NODE_ENV !== 'production'

async function ensureTransfersCapability(accountId: string): Promise<void> {
  const account = await stripe.accounts.retrieve(accountId)
  if (account.capabilities?.transfers === 'active') return

  if (!isTestMode) {
    throw new Error(`Destination account ${accountId} does not have transfers capability active`)
  }

  await stripe.accounts.update(accountId, {
    business_type: 'individual',
    business_profile: { url: process.env.NEXT_PUBLIC_BASE_URL ?? 'https://iameric.me', mcc: '7299' },
    individual: {
      first_name: account.individual?.first_name ?? 'Test',
      last_name:  account.individual?.last_name  ?? 'User',
      dob:        account.individual?.dob        ?? { day: 1, month: 1, year: 1990 },
      address:    account.individual?.address    ?? { line1: '123 Main St', city: 'San Francisco', state: 'CA', postal_code: '94111', country: 'US' },
      ssn_last_4: '0000',
    },
  // Stripe SDK type for update params is narrower than the actual API; cast needed
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  type LeanApplicant = { userId: unknown }
  type LeanUser = { stripeAccountId?: string }
  type LeanPledge = { _id: unknown; amount: number; stripePaymentIntentId?: string }
  const acceptedApplicant = await Applicant.findOne({ issueId, status: 'accepted' }).lean() as LeanApplicant | null
  if (!acceptedApplicant) throw new Error('No accepted applicant')

  const applicantUser = await UserModel.findById(acceptedApplicant.userId).lean() as LeanUser | null
  if (!applicantUser?.stripeAccountId) throw new Error('Applicant has no payout account')

  await ensureTransfersCapability(applicantUser.stripeAccountId)

  // Pledges were already charged at acceptance — retrieve charge IDs and transfer
  const pledges = await Pledge.find({
    issueId,
    stripePaymentIntentId: { $exists: true, $ne: null },
  }).lean() as LeanPledge[]

  if (pledges.length === 0) return

  const transferErrors: string[] = []

  await Promise.allSettled(
    pledges.map(async (pledge) => {
      try {
        if (!pledge.stripePaymentIntentId) return
        const piId = pledge.stripePaymentIntentId
        let pi = await stripe.paymentIntents.retrieve(piId)

        // Pledges are held with capture_method: 'manual' — capture before transferring.
        if (pi.status === 'requires_capture') {
          await stripe.paymentIntents.capture(piId)
          pi = await stripe.paymentIntents.retrieve(piId)
        }

        const chargeId = pi.latest_charge as string
        if (!chargeId) {
          console.error('[settleIssue] no charge on PI', piId)
          return
        }
        const accountId = applicantUser.stripeAccountId!
        await stripe.transfers.create({
          amount: pledge.amount * 100,
          currency: 'usd',
          destination: accountId,
          source_transaction: chargeId,
          description: `Payment for issue ${issueId}`,
        })
      } catch (err: unknown) {
        const msg = `Transfer failed for pledge ${pledge._id}: ${err instanceof Error ? err.message : String(err)}`
        console.error('[settleIssue]', msg)
        transferErrors.push(msg)
      }
    })
  )

  if (transferErrors.length > 0) {
    throw new Error(`Settlement incomplete — transfers failed: ${transferErrors.join('; ')}`)
  }
}
