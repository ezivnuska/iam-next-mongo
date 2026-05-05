// app/api/mobile/stripe/payout-card/route.ts
// GET    — return saved payout card info
// POST   — create Custom Connect account (if needed) + attach debit card token
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

export const GET = withAuth(async (req, token) => {
  const userId = token.id
  try {
    await connectToDatabase()
    const user = await UserModel.findById(userId).lean() as any
    if (!user?.stripeAccountId) return NextResponse.json({ payoutCard: null })

    const accounts = await stripe.accounts.listExternalAccounts(user.stripeAccountId, { object: 'card', limit: 1 })
    const card = accounts.data[0] ?? null
    return NextResponse.json({ payoutCard: card ? serializeCard(card) : null })
  } catch (err: any) {
    if (err?.code === 'resource_missing' || err?.code === 'account_invalid') {
      await UserModel.findByIdAndUpdate(userId, { $unset: { stripeAccountId: '', stripeAccountEnabled: '' } })
      return NextResponse.json({ payoutCard: null })
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
    const { token: cardToken } = await req.json()
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
      const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_')
      const account = await stripe.accounts.create({
        type: 'custom',
        country: 'US',
        business_type: 'individual',
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
            address: { line1: '123 Main St', city: 'San Francisco', state: 'CA', postal_code: '94111' },
            ssn_last_4: '0000',
          },
        }),
      })
      accountId = account.id
      await UserModel.findByIdAndUpdate(userId, { stripeAccountId: accountId })
      return account.external_accounts?.data[0]
    }

    if (!accountId) {
      card = await createFreshAccount()
    } else {
      const existing = await stripe.accounts.listExternalAccounts(accountId, { object: 'card' })
      await Promise.allSettled(existing.data.map((ea) => stripe.accounts.deleteExternalAccount(accountId, ea.id)))
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
    return NextResponse.json({ payoutCard: serializeCard(card) })
  } catch (err: any) {
    console.error('[stripe/payout-card POST]', err)
    return NextResponse.json({ error: err?.raw?.message ?? err?.message ?? 'Failed to set up payout card' }, { status: 500 })
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
      await Promise.allSettled(existing.data.map((ea) => stripe.accounts.deleteExternalAccount(user.stripeAccountId, ea.id)))
    }

    await UserModel.findByIdAndUpdate(userId, { stripeAccountEnabled: false })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[stripe/payout-card DELETE]', err)
    return NextResponse.json({ error: err?.message ?? 'Failed to remove payout card' }, { status: 500 })
  }
})
