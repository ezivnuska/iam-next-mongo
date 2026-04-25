// app/lib/stripe.ts

if (typeof window !== 'undefined') {
  throw new Error('Server-only module')
}

import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
export default stripe
