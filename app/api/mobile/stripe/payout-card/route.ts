// app/api/mobile/stripe/payout-card/route.ts
// GET    — return saved payout card info
// POST   — create Custom Connect account (if needed) + attach debit card token
// DELETE — remove payout card

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { verifyToken } from '@/app/lib/mobile/verifyToken'
import stripe from '@/app/lib/stripe'
import UserModel from '@/app/lib/models/user'

function serializeCard(card: any) {
  return {
    id: card.id,
    brand: card.brand,
    last4: card.last4,
    expMonth: card.exp_month,
    expYear: card.exp_year,
  }
}

export async function GET(req: NextRequest) {
  const tokenPayload = await verifyToken(req)
  if (!tokenPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await connectToDatabase()
    const user = await UserModel.findById(tokenPayload.id).lean() as any

    if (!user?.stripeAccountId) return NextResponse.json({ payoutCard: null })

    const accounts = await stripe.accounts.listExternalAccounts(user.stripeAccountId, { object: 'card', limit: 1 })
    const card = accounts.data[0] ?? null

    return NextResponse.json({ payoutCard: card ? serializeCard(card) : null })
  } catch (err: any) {
    if (err?.code === 'resource_missing' || err?.code === 'account_invalid') {
      await UserModel.findByIdAndUpdate(tokenPayload.id, {
        $unset: { stripeAccountId: '', stripeAccountEnabled: '' },
      })
      return NextResponse.json({ payoutCard: null })
    }
    console.error('[stripe/payout-card GET]', err)
    return NextResponse.json({ error: 'Failed to fetch payout card' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const tokenPayload = await verifyToken(req)
  if (!tokenPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await connectToDatabase()
    const user = await UserModel.findById(tokenPayload.id).lean() as any
    const { token } = await req.json()
    if (!token) return NextResponse.json({ error: 'Card token required' }, { status: 400 })

    let accountId = user?.stripeAccountId

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'custom',
        email: user.email,
        metadata: { userId: tokenPayload.id },
        capabilities: { transfers: { requested: true } },
        tos_acceptance: {
          date: Math.floor(Date.now() / 1000),
          ip: req.headers.get('x-forwarded-for')?.split(',')[0].trim() ?? '127.0.0.1',
        },
      })
      accountId = account.id
      await UserModel.findByIdAndUpdate(tokenPayload.id, { stripeAccountId: accountId })
    }

    // Remove any existing cards
    const existing = await stripe.accounts.listExternalAccounts(accountId, { object: 'card' })
    await Promise.allSettled(
      existing.data.map((ea) => stripe.accounts.deleteExternalAccount(accountId, ea.id))
    )

    const card = await stripe.accounts.createExternalAccount(accountId, {
      external_account: token,
    })

    await UserModel.findByIdAndUpdate(tokenPayload.id, { stripeAccountEnabled: true })

    return NextResponse.json({ payoutCard: serializeCard(card) })
  } catch (err: any) {
    console.error('[stripe/payout-card POST]', err)
    const message = err?.raw?.message ?? err?.message ?? 'Failed to set up payout card'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const tokenPayload = await verifyToken(req)
  if (!tokenPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await connectToDatabase()
    const user = await UserModel.findById(tokenPayload.id).lean() as any

    if (user?.stripeAccountId) {
      const existing = await stripe.accounts.listExternalAccounts(user.stripeAccountId, { object: 'card' })
      await Promise.allSettled(
        existing.data.map((ea) => stripe.accounts.deleteExternalAccount(user.stripeAccountId, ea.id))
      )
    }

    await UserModel.findByIdAndUpdate(tokenPayload.id, { stripeAccountEnabled: false })
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[stripe/payout-card DELETE]', err)
    return NextResponse.json({ error: err?.message ?? 'Failed to remove payout card' }, { status: 500 })
  }
}
