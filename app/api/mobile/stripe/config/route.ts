// app/api/mobile/stripe/config/route.ts
// GET — return the Stripe publishable key for the current environment

import { NextResponse } from 'next/server'

export const GET = () => {
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY ?? null
  return NextResponse.json({ publishableKey })
}
