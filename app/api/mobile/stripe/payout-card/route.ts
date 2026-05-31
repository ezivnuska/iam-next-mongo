// app/api/mobile/stripe/payout-card/route.ts
// GET    — return saved payout card info
// POST   — create Custom Connect account (if needed) + attach debit card token;
//          if paymentMethodToken is also provided, simultaneously set up payment method
// DELETE — remove payout card

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import stripe from '@/app/lib/stripe'
import UserModel from '@/app/lib/models/user'
import Pledge from '@/app/lib/models/pledge'
import Applicant from '@/app/lib/models/applicant'

function serializeCard(card: any) {
  return { id: card.id, brand: card.brand, last4: card.last4, expMonth: card.exp_month, expYear: card.exp_year }
}

async function getOrCreateCustomer(userId: string, user: any): Promise<string> {
  if (user.stripeCustomerId) {
    try {
      await stripe.customers.retrieve(user.stripeCustomerId)
      return user.stripeCustomerId
    } catch (err: any) {
      if (err?.code !== 'resource_missing') throw err
      await UserModel.findByIdAndUpdate(userId, { $unset: { stripeCustomerId: '', stripeDefaultPaymentMethodId: '' } })
    }
  }
  const customer = await stripe.customers.create({ email: user.email, metadata: { userId } })
  await UserModel.findByIdAndUpdate(userId, { stripeCustomerId: customer.id })
  return customer.id
}

export const GET = withAuth(async (req, token) => {
  const userId = token.id
  try {
    await connectToDatabase()
    const [user, workerDoc] = await Promise.all([
      UserModel.findById(userId).lean() as any,
      Applicant.exists({ userId, acceptedAt: { $exists: true } }),
    ])
    const isWorker = !!workerDoc

    if (!user?.stripeAccountId) return NextResponse.json({ payoutCard: null, isWorker })

    const accounts = await stripe.accounts.listExternalAccounts(user.stripeAccountId, { object: 'card', limit: 1 })
    const card = accounts.data[0] ?? null
    return NextResponse.json({ payoutCard: card ? serializeCard(card) : null, isWorker })
  } catch (err: any) {
    if (err?.code === 'resource_missing' || err?.code === 'account_invalid') {
      await UserModel.findByIdAndUpdate(userId, { $unset: { stripeAccountId: '', stripeAccountEnabled: '' } })
      return NextResponse.json({ payoutCard: null, isWorker: false })
    }
    if (err?.code === 'platform_account_required') {
      return NextResponse.json({ payoutCard: null, isWorker: false })
    }
    console.error('[stripe/payout-card GET]', err)
    return NextResponse.json({ error: 'Failed to fetch payout card' }, { status: 500 })
  }
})

export const POST = withAuth(async (req, token) => {
  const userId = token.id
  try {
    await connectToDatabase()
    const user = await UserModel.findById(userId).lean() as any
    const { token: cardToken, paymentMethodToken } = await req.json()
    if (!cardToken) return NextResponse.json({ error: 'Card token required' }, { status: 400 })

    let accountId = user?.stripeAccountId
    let card: any

    if (accountId) {
      try {
        await stripe.accounts.retrieve(accountId)
      } catch {
        await UserModel.findByIdAndUpdate(userId, { $unset: { stripeAccountId: '', stripeAccountEnabled: '' } })
        accountId = null
      }
    }

    async function createFreshAccount() {
      if (accountId) {
        try { await stripe.accounts.del(accountId) } catch {}
        await UserModel.findByIdAndUpdate(userId, { $unset: { stripeAccountId: '', stripeAccountEnabled: '' } })
        accountId = null
      }
      const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') && process.env.NODE_ENV !== 'production'
      const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://iameric.me'
      const account = await stripe.accounts.create({
        type: 'custom',
        country: 'US',
        business_type: 'individual',
        business_profile: { url: BASE, mcc: '7299' },
        email: user.email,
        external_account: cardToken,
        metadata: { userId },
        capabilities: { transfers: { requested: true } },
        tos_acceptance: {
          date: Math.floor(Date.now() / 1000),
          ip: req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1',
        },
        ...(isTestMode && {
          individual: {
            first_name: user.username ?? 'Test',
            last_name: 'User',
            email: user.email,
            dob: { day: 1, month: 1, year: 1990 },
            address: { line1: '123 Main St', city: 'San Francisco', state: 'CA', postal_code: '94111', country: 'US' },
            ssn_last_4: '0000',
          },
        }),
      })
      accountId = account.id
      await UserModel.findByIdAndUpdate(userId, { stripeAccountId: accountId })

      // In test mode, verify the transfers capability activated; if still pending, update to trigger re-evaluation
      if (isTestMode) {
        const retrieved = await stripe.accounts.retrieve(accountId)
        if (retrieved.capabilities?.transfers !== 'active') {
          await stripe.accounts.update(accountId, {
            individual: { ssn_last_4: '0000' },
          }).catch(() => {})
        }
      }

      return account.external_accounts?.data[0]
    }

    if (!accountId) {
      card = await createFreshAccount()
    } else {
      const existing = await stripe.accounts.listExternalAccounts(accountId, { object: 'card' })
      await Promise.allSettled(existing.data.map((ea: { id: string }) => stripe.accounts.deleteExternalAccount(accountId, ea.id)))
      try {
        card = await stripe.accounts.createExternalAccount(accountId, { external_account: cardToken })
      } catch (err: any) {
        if (err?.code === 'oauth_not_supported') {
          card = await createFreshAccount()
        } else {
          throw err
        }
      }
    }

    await UserModel.findByIdAndUpdate(userId, { stripeAccountEnabled: true })
    if (!card) return NextResponse.json({ error: 'Card not attached' }, { status: 500 })

    let paymentMethod = null
    if (paymentMethodToken) {
      try {
        const freshUser = await UserModel.findById(userId).lean() as any
        const customerId = await getOrCreateCustomer(userId, freshUser)
        const pm = await stripe.paymentMethods.create({ type: 'card', card: { token: paymentMethodToken } })
        await stripe.paymentMethods.attach(pm.id, { customer: customerId })
        await UserModel.findByIdAndUpdate(userId, { stripeDefaultPaymentMethodId: pm.id })
        paymentMethod = {
          id: pm.id,
          brand: pm.card?.brand ?? '',
          last4: pm.card?.last4 ?? '',
          expMonth: pm.card?.exp_month ?? 0,
          expYear: pm.card?.exp_year ?? 0,
        }
      } catch (err) {
        console.warn('[stripe/payout-card POST] payment method setup failed, continuing:', (err as any)?.message)
      }
    }

    return NextResponse.json({ payoutCard: serializeCard(card), paymentMethod })
  } catch (err: any) {
    console.error('[stripe/payout-card POST]', err)
    const stripeErrorMessages: Record<string, string> = {
      oauth_not_supported: 'Unable to link card to this account. Please try again.',
      resource_missing: 'Payout account not found. Please set up a new one.',
      account_invalid: 'Payout account is invalid. Please set up a new one.',
      card_declined: 'The card was declined. Please use a different debit card.',
      incorrect_number: 'The card number is incorrect.',
      expired_card: 'The card has expired.',
      incorrect_cvc: 'The card security code is incorrect.',
      invalid_expiry_year: 'The expiry year is invalid.',
      invalid_expiry_month: 'The expiry month is invalid.',
    }
    const userMessage = (err?.code && stripeErrorMessages[err.code]) ?? 'Failed to set up payout card. Please try again.'
    return NextResponse.json({ error: userMessage }, { status: 500 })
  }
})

export const DELETE = withAuth(async (req, token) => {
  const userId = token.id
  try {
    await connectToDatabase()

    const acceptedApplication = await Applicant.findOne({ userId, status: 'accepted' }).lean() as any
    if (acceptedApplication) {
      const heldPledge = await Pledge.findOne({
        issueId: acceptedApplication.issueId,
        stripePaymentIntentId: { $exists: true, $ne: null },
      }).lean()
      if (heldPledge) {
        return NextResponse.json(
          { error: 'You have funds pending payout for accepted work. Your payout card cannot be removed until that issue is settled.' },
          { status: 409 }
        )
      }
    }

    const user = await UserModel.findById(userId).lean() as any
    if (user?.stripeAccountId) {
      const existing = await stripe.accounts.listExternalAccounts(user.stripeAccountId, { object: 'card' })
      await Promise.allSettled(existing.data.map((ea: { id: string }) => stripe.accounts.deleteExternalAccount(user.stripeAccountId, ea.id)))
    }

    await UserModel.findByIdAndUpdate(userId, { stripeAccountEnabled: false })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    if (err?.code === 'platform_account_required') {
      return NextResponse.json({ ok: true })
    }
    console.error('[stripe/payout-card DELETE]', err)
    return NextResponse.json({ error: err?.message ?? 'Failed to remove payout card' }, { status: 500 })
  }
})
