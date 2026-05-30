// app/lib/stripe.ts

if (typeof window !== 'undefined') {
  throw new Error('Server-only module')
}

import Stripe from 'stripe'

// Lazy singleton — avoids crashing at import time when STRIPE_SECRET_KEY is absent
let _stripe: Stripe.Stripe | null = null
const stripe = new Proxy({} as Stripe.Stripe, {
  get(_, prop) {
    if (!_stripe) {
      const key = process.env.STRIPE_SECRET_KEY
      if (!key) throw new Error('STRIPE_SECRET_KEY is not configured')
      _stripe = new Stripe(key)
    }
    return (_stripe as any)[prop]
  },
})
export default stripe
