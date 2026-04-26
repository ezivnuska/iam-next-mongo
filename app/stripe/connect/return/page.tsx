// app/stripe/connect/return/page.tsx
// Stripe redirects here after Connect onboarding; we bounce the user back into the app.

import { redirect } from 'next/navigation'

export default function ConnectReturn() {
  redirect('iamexpo://stripe/connect/return')
}
