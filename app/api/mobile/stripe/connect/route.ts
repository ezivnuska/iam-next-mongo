// app/api/mobile/stripe/connect/route.ts
// GET    — return Connect account status
// POST   — create/get Connect account and return onboarding URL
// PATCH  — generate a one-time Express dashboard login link
// DELETE — unlink (and delete if unused) the Connect account

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { verifyToken } from '@/app/lib/mobile/verifyToken'
import stripe from '@/app/lib/stripe'
import UserModel from '@/app/lib/models/user'

export async function GET(req: NextRequest) {
  const tokenPayload = await verifyToken(req)
  if (!tokenPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await connectToDatabase()
    const user = await UserModel.findById(tokenPayload.id).lean() as any

    if (!user?.stripeAccountId) {
      return NextResponse.json({ connected: false, payoutsEnabled: false })
    }

    // Refresh status from Stripe in case it changed
    const account = await stripe.accounts.retrieve(user.stripeAccountId)
    const payoutsEnabled = account.payouts_enabled ?? false

    if (payoutsEnabled !== user.stripeAccountEnabled) {
      await UserModel.findByIdAndUpdate(tokenPayload.id, { stripeAccountEnabled: payoutsEnabled })
    }

    return NextResponse.json({ connected: true, payoutsEnabled })
  } catch (err) {
    console.error('[stripe/connect GET]', err)
    return NextResponse.json({ error: 'Failed to fetch Connect status' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const tokenPayload = await verifyToken(req)
  if (!tokenPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await connectToDatabase()
    const user = await UserModel.findById(tokenPayload.id).lean() as any

    const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://iameric.me'
    let accountId = user?.stripeAccountId

    // Verify the saved account still exists in Stripe
    if (accountId) {
      try {
        await stripe.accounts.retrieve(accountId)
      } catch (err: any) {
        if (err?.code === 'resource_missing') {
          await UserModel.findByIdAndUpdate(tokenPayload.id, {
            $unset: { stripeAccountId: '', stripeAccountEnabled: '' },
          })
          accountId = null
        } else {
          throw err
        }
      }
    }

    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: user.email,
        business_type: 'individual',
        business_profile: {
          url: BASE,
          mcc: '7299', // Services, NEC
        },
        metadata: { userId: tokenPayload.id },
        capabilities: { transfers: { requested: true } },
      })
      accountId = account.id
      await UserModel.findByIdAndUpdate(tokenPayload.id, { stripeAccountId: accountId })
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      return_url: `${BASE}/`,
      refresh_url: `${BASE}/`,
      type: 'account_onboarding',
      collection_options: { fields: 'currently_due' },
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (err: any) {
    console.error('[stripe/connect POST]', err)
    return NextResponse.json({ error: err?.message ?? 'Failed to create Connect onboarding' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  const tokenPayload = await verifyToken(req)
  if (!tokenPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await connectToDatabase()
    const user = await UserModel.findById(tokenPayload.id).lean() as any

    if (!user?.stripeAccountId) {
      return NextResponse.json({ error: 'No Connect account linked' }, { status: 404 })
    }

    const loginLink = await stripe.accounts.createLoginLink(user.stripeAccountId)
    return NextResponse.json({ url: loginLink.url })
  } catch (err: any) {
    console.error('[stripe/connect PATCH]', err)
    return NextResponse.json({ error: err?.message ?? 'Failed to generate login link' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  const tokenPayload = await verifyToken(req)
  if (!tokenPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await connectToDatabase()
    const user = await UserModel.findById(tokenPayload.id).lean() as any

    if (user?.stripeAccountId) {
      try {
        await stripe.accounts.del(user.stripeAccountId)
      } catch (err: any) {
        // Account has activity and cannot be deleted — just unlink it
        console.warn('[stripe/connect DELETE] could not delete account, unlinking only:', err?.message)
      }
    }

    await UserModel.findByIdAndUpdate(tokenPayload.id, {
      $unset: { stripeAccountId: '', stripeAccountEnabled: '' },
    })

    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[stripe/connect DELETE]', err)
    return NextResponse.json({ error: err?.message ?? 'Failed to unlink account' }, { status: 500 })
  }
}
