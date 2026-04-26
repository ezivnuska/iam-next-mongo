// app/api/mobile/stripe/connect/route.ts
// GET  — return Connect account status
// POST — create/get Connect account and return onboarding URL

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

  const BASE = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://iameric.me'
  const returnUrl = `${BASE}/stripe/connect/return`

  try {
    await connectToDatabase()
    const user = await UserModel.findById(tokenPayload.id).lean() as any

    let accountId = user?.stripeAccountId
    if (!accountId) {
      const account = await stripe.accounts.create({
        controller: {
          stripe_dashboard: { type: 'express' },
          fees: { payer: 'application' },
          losses: { payments: 'application' },
          requirement_collection: 'stripe',
        },
        email: user.email,
        metadata: { userId: tokenPayload.id },
      })
      accountId = account.id
      await UserModel.findByIdAndUpdate(tokenPayload.id, { stripeAccountId: accountId })
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      return_url: returnUrl,
      refresh_url: returnUrl,
      type: 'account_onboarding',
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (err: any) {
    console.error('[stripe/connect POST]', err)
    return NextResponse.json({ error: err?.message ?? 'Failed to create Connect onboarding' }, { status: 500 })
  }
}
