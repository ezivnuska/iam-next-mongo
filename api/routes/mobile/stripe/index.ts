// api/routes/mobile/stripe/index.ts
// All Stripe routes:
//   /api/mobile/stripe/setup       — payment method CRUD
//   /api/mobile/stripe/connect     — Connect account CRUD
//   /api/mobile/stripe/payout-card — payout card CRUD
//   /api/mobile/stripe/dashboard   — dashboard data

import { Hono } from 'hono'
import { authMiddleware, TokenPayload } from '../../../middleware/auth'
import { connectToDatabase } from '../../../../app/lib/mongoose'
import stripeClient from '../../../../app/lib/stripe'
import UserModel from '../../../../app/lib/models/user'
import Pledge from '../../../../app/lib/models/pledge'
import Applicant from '../../../../app/lib/models/applicant'
import '../../../../app/lib/models/issue'

// Keep in sync with node_modules/stripe/cjs/apiVersion.js
const STRIPE_API_VERSION = '2026-04-22.dahlia'

const stripeRoutes = new Hono<{ Variables: { token: TokenPayload } }>()

// ─── /stripe/setup ────────────────────────────────────────────────────────────

async function getOrCreateCustomer(user: any): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId
  const customer = await stripeClient.customers.create({
    email: user.email,
    metadata: { userId: user._id.toString() },
  })
  await UserModel.findByIdAndUpdate(user._id, { stripeCustomerId: customer.id })
  return customer.id
}

stripeRoutes.get('/api/mobile/stripe/setup', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    await connectToDatabase()
    const user = await UserModel.findById(token.id).lean() as any
    if (!user?.stripeDefaultPaymentMethodId) return c.json({ paymentMethod: null })

    const pm = await stripeClient.paymentMethods.retrieve(user.stripeDefaultPaymentMethodId)
    return c.json({
      paymentMethod: { id: pm.id, brand: pm.card?.brand, last4: pm.card?.last4, expMonth: pm.card?.exp_month, expYear: pm.card?.exp_year },
    })
  } catch (err) {
    console.error('[stripe/setup GET]', err)
    return c.json({ error: 'Failed to fetch payment method' }, 500)
  }
})

stripeRoutes.post('/api/mobile/stripe/setup', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    await connectToDatabase()
    const user = await UserModel.findById(token.id).lean() as any
    const customerId = await getOrCreateCustomer(user)

    const [setupIntent, ephemeralKey] = await Promise.all([
      stripeClient.setupIntents.create({ customer: customerId, payment_method_types: ['card'], usage: 'off_session' }),
      stripeClient.ephemeralKeys.create({ customer: customerId }, { apiVersion: STRIPE_API_VERSION }),
    ])

    return c.json({ setupIntentClientSecret: setupIntent.client_secret, ephemeralKeySecret: ephemeralKey.secret, customerId })
  } catch (err) {
    console.error('[stripe/setup POST]', err)
    return c.json({ error: 'Failed to create setup intent' }, 500)
  }
})

stripeRoutes.patch('/api/mobile/stripe/setup', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    await connectToDatabase()
    const user = await UserModel.findById(token.id).lean() as any
    if (!user?.stripeCustomerId) return c.json({ error: 'No Stripe customer' }, 400)

    const paymentMethods = await stripeClient.paymentMethods.list({ customer: user.stripeCustomerId, type: 'card', limit: 1 })
    if (paymentMethods.data.length === 0) return c.json({ error: 'No payment method found' }, 404)

    const pm = paymentMethods.data[0]
    await UserModel.findByIdAndUpdate(token.id, { stripeDefaultPaymentMethodId: pm.id })

    return c.json({
      paymentMethod: { id: pm.id, brand: pm.card?.brand, last4: pm.card?.last4, expMonth: pm.card?.exp_month, expYear: pm.card?.exp_year },
    })
  } catch (err) {
    console.error('[stripe/setup PATCH]', err)
    return c.json({ error: 'Failed to confirm setup' }, 500)
  }
})

stripeRoutes.delete('/api/mobile/stripe/setup', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    await connectToDatabase()
    const heldPledge = await Pledge.findOne({ userId: token.id, stripePaymentIntentId: { $exists: true, $ne: null } }).lean()
    if (heldPledge)
      return c.json({ error: 'You have funds currently held for active pledges. Your payment method cannot be removed until those issues are resolved.' }, 409)

    const user = await UserModel.findById(token.id).lean() as any
    if (user?.stripeDefaultPaymentMethodId) {
      await stripeClient.paymentMethods.detach(user.stripeDefaultPaymentMethodId)
      await UserModel.findByIdAndUpdate(token.id, { $unset: { stripeDefaultPaymentMethodId: '' } })
    }
    return c.json({ ok: true })
  } catch (err) {
    console.error('[stripe/setup DELETE]', err)
    return c.json({ error: 'Failed to remove payment method' }, 500)
  }
})

// ─── /stripe/connect ──────────────────────────────────────────────────────────

function isStaleAccountError(err: any) {
  return err?.code === 'resource_missing' || err?.code === 'account_invalid'
}

stripeRoutes.get('/api/mobile/stripe/connect', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    await connectToDatabase()
    const user = await UserModel.findById(token.id).lean() as any
    if (!user?.stripeAccountId) return c.json({ connected: false, payoutsEnabled: false })

    let account
    try {
      account = await stripeClient.accounts.retrieve(user.stripeAccountId)
    } catch (err: any) {
      if (isStaleAccountError(err)) {
        await UserModel.findByIdAndUpdate(token.id, { $unset: { stripeAccountId: '', stripeAccountEnabled: '' } })
        return c.json({ connected: false, payoutsEnabled: false })
      }
      throw err
    }

    const payoutsEnabled = account.payouts_enabled ?? false
    if (payoutsEnabled !== user.stripeAccountEnabled)
      await UserModel.findByIdAndUpdate(token.id, { stripeAccountEnabled: payoutsEnabled })
    return c.json({ connected: true, payoutsEnabled })
  } catch (err) {
    console.error('[stripe/connect GET]', err)
    return c.json({ error: 'Failed to fetch Connect status' }, 500)
  }
})

stripeRoutes.post('/api/mobile/stripe/connect', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    await connectToDatabase()
    const user = await UserModel.findById(token.id).lean() as any
    const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://iameric.me'
    let accountId = user?.stripeAccountId

    if (accountId) {
      try {
        await stripeClient.accounts.retrieve(accountId)
      } catch (err: any) {
        if (isStaleAccountError(err)) {
          await UserModel.findByIdAndUpdate(token.id, { $unset: { stripeAccountId: '', stripeAccountEnabled: '' } })
          accountId = null
        } else throw err
      }
    }

    if (!accountId) {
      const account = await stripeClient.accounts.create({
        type: 'express',
        email: user.email,
        business_type: 'individual',
        business_profile: { url: BASE, mcc: '7299' },
        metadata: { userId: token.id },
        capabilities: { transfers: { requested: true } },
      })
      accountId = account.id
      await UserModel.findByIdAndUpdate(token.id, { stripeAccountId: accountId })
    }

    const accountLink = await stripeClient.accountLinks.create({
      account: accountId,
      return_url: `${BASE}/`,
      refresh_url: `${BASE}/`,
      type: 'account_onboarding',
      collection_options: { fields: 'currently_due' },
    })
    return c.json({ url: accountLink.url })
  } catch (err: any) {
    console.error('[stripe/connect POST]', err)
    return c.json({ error: err?.message ?? 'Failed to create Connect onboarding' }, 500)
  }
})

stripeRoutes.patch('/api/mobile/stripe/connect', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    await connectToDatabase()
    const user = await UserModel.findById(token.id).lean() as any
    if (!user?.stripeAccountId) return c.json({ error: 'No Connect account linked' }, 404)

    const loginLink = await stripeClient.accounts.createLoginLink(user.stripeAccountId)
    return c.json({ url: loginLink.url })
  } catch (err: any) {
    console.error('[stripe/connect PATCH]', err)
    return c.json({ error: err?.message ?? 'Failed to generate login link' }, 500)
  }
})

stripeRoutes.delete('/api/mobile/stripe/connect', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    await connectToDatabase()
    const user = await UserModel.findById(token.id).lean() as any
    if (user?.stripeAccountId) {
      try {
        await stripeClient.accounts.del(user.stripeAccountId)
      } catch (err: any) {
        console.warn('[stripe/connect DELETE] could not delete account, unlinking only:', err?.message)
      }
    }
    await UserModel.findByIdAndUpdate(token.id, { $unset: { stripeAccountId: '', stripeAccountEnabled: '' } })
    return c.json({ ok: true })
  } catch (err: any) {
    console.error('[stripe/connect DELETE]', err)
    return c.json({ error: err?.message ?? 'Failed to unlink account' }, 500)
  }
})

// ─── /stripe/payout-card ─────────────────────────────────────────────────────

function serializeCard(card: any) {
  return { id: card.id, brand: card.brand, last4: card.last4, expMonth: card.exp_month, expYear: card.exp_year }
}

stripeRoutes.get('/api/mobile/stripe/payout-card', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    await connectToDatabase()
    const user = await UserModel.findById(token.id).lean() as any
    if (!user?.stripeAccountId) return c.json({ payoutCard: null })

    const accounts = await stripeClient.accounts.listExternalAccounts(user.stripeAccountId, { object: 'card', limit: 1 })
    const card = accounts.data[0] ?? null
    return c.json({ payoutCard: card ? serializeCard(card) : null })
  } catch (err: any) {
    if (err?.code === 'resource_missing' || err?.code === 'account_invalid') {
      await UserModel.findByIdAndUpdate(token.id, { $unset: { stripeAccountId: '', stripeAccountEnabled: '' } })
      return c.json({ payoutCard: null })
    }
    console.error('[stripe/payout-card GET]', err)
    return c.json({ error: 'Failed to fetch payout card' }, 500)
  }
})

stripeRoutes.post('/api/mobile/stripe/payout-card', authMiddleware, async (c) => {
  const token = c.get('token')
  const userId = token.id
  try {
    await connectToDatabase()
    const user = await UserModel.findById(userId).lean() as any
    const { token: cardToken } = await c.req.json()
    if (!cardToken) return c.json({ error: 'Card token required' }, 400)

    let accountId = user?.stripeAccountId
    let card: any

    if (accountId) {
      try {
        await stripeClient.accounts.retrieve(accountId)
      } catch {
        await UserModel.findByIdAndUpdate(userId, { $unset: { stripeAccountId: '', stripeAccountEnabled: '' } })
        accountId = null
      }
    }

    async function createFreshAccount() {
      if (accountId) {
        try { await stripeClient.accounts.del(accountId) } catch {}
        await UserModel.findByIdAndUpdate(userId, { $unset: { stripeAccountId: '', stripeAccountEnabled: '' } })
        accountId = null
      }
      const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith('sk_test_') && process.env.NODE_ENV !== 'production'
      const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://iameric.me'
      const forwardedFor = c.req.header('x-forwarded-for')
      const account = await stripeClient.accounts.create({
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
          ip: forwardedFor?.split(',')[0].trim() ?? '127.0.0.1',
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

      if (isTestMode) {
        const retrieved = await stripeClient.accounts.retrieve(accountId)
        if (retrieved.capabilities?.transfers !== 'active') {
          await stripeClient.accounts.update(accountId, { individual: { ssn_last_4: '0000' } }).catch(() => {})
        }
      }

      return account.external_accounts?.data[0]
    }

    if (!accountId) {
      card = await createFreshAccount()
    } else {
      const existing = await stripeClient.accounts.listExternalAccounts(accountId, { object: 'card' })
      await Promise.allSettled(existing.data.map((ea: { id: string }) => stripeClient.accounts.deleteExternalAccount(accountId, ea.id)))
      try {
        card = await stripeClient.accounts.createExternalAccount(accountId, { external_account: cardToken })
      } catch (err: any) {
        if (err?.code === 'oauth_not_supported') {
          card = await createFreshAccount()
        } else throw err
      }
    }

    await UserModel.findByIdAndUpdate(userId, { stripeAccountEnabled: true })
    if (!card) return c.json({ error: 'Card not attached' }, 500)
    return c.json({ payoutCard: serializeCard(card) })
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
    return c.json({ error: userMessage }, 500)
  }
})

stripeRoutes.delete('/api/mobile/stripe/payout-card', authMiddleware, async (c) => {
  const token = c.get('token')
  const userId = token.id
  try {
    await connectToDatabase()

    const acceptedApplication = await Applicant.findOne({ userId, status: 'accepted' }).lean() as any
    if (acceptedApplication) {
      const heldPledge = await Pledge.findOne({
        issueId: acceptedApplication.issueId,
        stripePaymentIntentId: { $exists: true, $ne: null },
      }).lean()
      if (heldPledge)
        return c.json({ error: 'You have funds pending payout for accepted work. Your payout card cannot be removed until that issue is settled.' }, 409)
    }

    const user = await UserModel.findById(userId).lean() as any
    if (user?.stripeAccountId) {
      const existing = await stripeClient.accounts.listExternalAccounts(user.stripeAccountId, { object: 'card' })
      await Promise.allSettled(existing.data.map((ea: { id: string }) => stripeClient.accounts.deleteExternalAccount(user.stripeAccountId, ea.id)))
    }

    await UserModel.findByIdAndUpdate(userId, { stripeAccountEnabled: false })
    return c.json({ ok: true })
  } catch (err: any) {
    console.error('[stripe/payout-card DELETE]', err)
    return c.json({ error: err?.message ?? 'Failed to remove payout card' }, 500)
  }
})

// ─── /stripe/dashboard ───────────────────────────────────────────────────────

stripeRoutes.get('/api/mobile/stripe/dashboard', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    await connectToDatabase()
    const user = await UserModel.findById(token.id).lean() as any

    const rawPledges = await Pledge.find({ userId: token.id })
      .populate({ path: 'issueId', select: 'issueType status' })
      .sort({ createdAt: -1 })
      .lean() as any[]

    const activeIssueIds = rawPledges.map((p) => (p.issueId as any)?._id).filter(Boolean)
    const acceptedApplicants = activeIssueIds.length > 0
      ? await Applicant.find({ issueId: { $in: activeIssueIds }, status: 'accepted' }).select('issueId').lean()
      : []
    const acceptedIssueIds = new Set((acceptedApplicants as any[]).map((a) => a.issueId.toString()))

    const pledges = rawPledges.map((p) => {
      const need = p.issueId as any
      const issueId = need?._id?.toString() ?? null
      let status: 'held' | 'paid' | 'pledged'
      if (need?.status === 'completed') status = 'paid'
      else if (issueId && acceptedIssueIds.has(issueId)) status = 'held'
      else status = 'pledged'
      return { id: p._id.toString(), issueId, issueType: need?.issueType ?? null, amount: p.amount, status, createdAt: p.createdAt }
    })

    let connect: {
      availableCents: number
      pendingCents: number
      transfers: { id: string; amountCents: number; created: number; description: string | null }[]
    } | null = null

    if (user?.stripeAccountId) {
      const [balanceResult, transfersResult] = await Promise.allSettled([
        stripeClient.balance.retrieve({}, { stripeAccount: user.stripeAccountId }),
        stripeClient.transfers.list({ destination: user.stripeAccountId, limit: 20 }),
      ])

      const staleAccount = [balanceResult, transfersResult].some((r) => {
        if (r.status !== 'rejected') return false
        const code = (r.reason as any)?.code
        return code === 'resource_missing' || code === 'account_invalid'
      })

      if (staleAccount) {
        await UserModel.findByIdAndUpdate(token.id, { $unset: { stripeAccountId: '', stripeAccountEnabled: '' } })
      } else {
        const balance = balanceResult.status === 'fulfilled' ? balanceResult.value : null
        const transferData = transfersResult.status === 'fulfilled' ? transfersResult.value.data : []
        if (balanceResult.status === 'rejected')
          console.error('[stripe/dashboard] balance.retrieve failed:', (balanceResult as any).reason?.message)
        if (transfersResult.status === 'rejected')
          console.error('[stripe/dashboard] transfers.list failed:', (transfersResult as any).reason?.message)
        connect = {
          availableCents: balance?.available.reduce((sum, b) => sum + b.amount, 0) ?? 0,
          pendingCents: balance?.pending.reduce((sum, b) => sum + b.amount, 0) ?? 0,
          transfers: transferData.map((t) => ({ id: t.id, amountCents: t.amount, created: t.created, description: t.description ?? null })),
        }
      }
    }

    return c.json({ pledges, connect })
  } catch (err: any) {
    console.error('[stripe/dashboard GET]', err)
    return c.json({ error: err?.message ?? 'Failed to load dashboard' }, 500)
  }
})

export default stripeRoutes
