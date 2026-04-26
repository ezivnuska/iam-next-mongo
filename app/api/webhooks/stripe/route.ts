// app/api/webhooks/stripe/route.ts
// Stripe webhook handler

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import stripe from '@/app/lib/stripe'
import UserModel from '@/app/lib/models/user'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  let event
  try {
    event = await stripe.webhooks.constructEventAsync(body, sig!, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[stripe webhook] signature verification failed', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    await connectToDatabase()

    if (event.type === 'account.updated') {
      const account = event.data.object as any
      const userId = account.metadata?.userId
      if (userId) {
        await UserModel.findByIdAndUpdate(userId, {
          stripeAccountEnabled: account.payouts_enabled ?? false,
        })
      }
    }

    return NextResponse.json({ received: true })
  } catch (err) {
    console.error('[stripe webhook]', err)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}
