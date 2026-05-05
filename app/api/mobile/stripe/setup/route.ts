// app/api/mobile/stripe/setup/route.ts
// GET    — return saved payment method info (last4, brand)
// POST   — create a SetupIntent + ephemeral key for payment sheet
// PATCH  — confirm setup: find + set the most recent payment method as default
// DELETE — remove saved payment method

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import stripe from '@/app/lib/stripe'
import UserModel from '@/app/lib/models/user'
import Pledge from '@/app/lib/models/pledge'

// Keep in sync with node_modules/stripe/cjs/apiVersion.js when upgrading the stripe package
const STRIPE_API_VERSION = '2026-04-22.dahlia'

async function getOrCreateCustomer(user: any): Promise<string> {
  if (user.stripeCustomerId) return user.stripeCustomerId
  const customer = await stripe.customers.create({
    email: user.email,
    metadata: { userId: user._id.toString() },
  })
  await UserModel.findByIdAndUpdate(user._id, { stripeCustomerId: customer.id })
  return customer.id
}

export const GET = withAuth(async (req, token) => {
  try {
    await connectToDatabase()
    const user = await UserModel.findById(token.id).lean() as any
    if (!user?.stripeDefaultPaymentMethodId) return NextResponse.json({ paymentMethod: null })

    const pm = await stripe.paymentMethods.retrieve(user.stripeDefaultPaymentMethodId)
    return NextResponse.json({
      paymentMethod: { id: pm.id, brand: pm.card?.brand, last4: pm.card?.last4, expMonth: pm.card?.exp_month, expYear: pm.card?.exp_year },
    })
  } catch (err) {
    console.error('[stripe/setup GET]', err)
    return NextResponse.json({ error: 'Failed to fetch payment method' }, { status: 500 })
  }
})

export const POST = withAuth(async (req, token) => {
  try {
    await connectToDatabase()
    const user = await UserModel.findById(token.id).lean() as any
    const customerId = await getOrCreateCustomer(user)

    const [setupIntent, ephemeralKey] = await Promise.all([
      stripe.setupIntents.create({ customer: customerId, payment_method_types: ['card'], usage: 'off_session' }),
      stripe.ephemeralKeys.create({ customer: customerId }, { apiVersion: STRIPE_API_VERSION }),
    ])

    return NextResponse.json({ setupIntentClientSecret: setupIntent.client_secret, ephemeralKeySecret: ephemeralKey.secret, customerId })
  } catch (err) {
    console.error('[stripe/setup POST]', err)
    return NextResponse.json({ error: 'Failed to create setup intent' }, { status: 500 })
  }
})

export const PATCH = withAuth(async (req, token) => {
  try {
    await connectToDatabase()
    const user = await UserModel.findById(token.id).lean() as any
    if (!user?.stripeCustomerId) return NextResponse.json({ error: 'No Stripe customer' }, { status: 400 })

    const paymentMethods = await stripe.paymentMethods.list({ customer: user.stripeCustomerId, type: 'card', limit: 1 })
    if (paymentMethods.data.length === 0) return NextResponse.json({ error: 'No payment method found' }, { status: 404 })

    const pm = paymentMethods.data[0]
    await UserModel.findByIdAndUpdate(token.id, { stripeDefaultPaymentMethodId: pm.id })

    return NextResponse.json({
      paymentMethod: { id: pm.id, brand: pm.card?.brand, last4: pm.card?.last4, expMonth: pm.card?.exp_month, expYear: pm.card?.exp_year },
    })
  } catch (err) {
    console.error('[stripe/setup PATCH]', err)
    return NextResponse.json({ error: 'Failed to confirm setup' }, { status: 500 })
  }
})

export const DELETE = withAuth(async (req, token) => {
  try {
    await connectToDatabase()

    const heldPledge = await Pledge.findOne({ userId: token.id, stripePaymentIntentId: { $exists: true, $ne: null } }).lean()
    if (heldPledge) {
      return NextResponse.json(
        { error: 'You have funds currently held for active pledges. Your payment method cannot be removed until those issues are resolved.' },
        { status: 409 }
      )
    }

    const user = await UserModel.findById(token.id).lean() as any
    if (user?.stripeDefaultPaymentMethodId) {
      await stripe.paymentMethods.detach(user.stripeDefaultPaymentMethodId)
      await UserModel.findByIdAndUpdate(token.id, { $unset: { stripeDefaultPaymentMethodId: '' } })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[stripe/setup DELETE]', err)
    return NextResponse.json({ error: 'Failed to remove payment method' }, { status: 500 })
  }
})
