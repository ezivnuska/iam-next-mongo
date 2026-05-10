// app/api/mobile/issues/[id]/pledges/[pledgeId]/route.ts
// DELETE — remove a pledge and cancel the associated PaymentIntent (owner only)

import { isValidObjectId } from '@/app/lib/utils/validation'
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import { emitIssuePledgeRemoved } from '@/app/lib/socket/emit'
import Pledge from '@/app/lib/models/pledge'
import Issue from '@/app/lib/models/issue'
import stripe from '@/app/lib/stripe'

export const DELETE = withAuth(async (req, token, ctx) => {
  const { pledgeId } = await ctx.params
  if (!isValidObjectId(pledgeId)) return NextResponse.json({ error: 'Invalid pledge ID' }, { status: 400 })

  try {
    await connectToDatabase()
    const pledge = await Pledge.findById(pledgeId)
    if (!pledge) return NextResponse.json({ error: 'Pledge not found' }, { status: 404 })
    if (pledge.userId.toString() !== token.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const issue = await Issue.findById(pledge.issueId, { author: 1 }).lean() as any
    if (issue?.author?.toString() === token.id)
      return NextResponse.json({ error: 'Your initial pledge cannot be removed' }, { status: 403 })

    if (pledge.stripePaymentIntentId) {
      try {
        await stripe.paymentIntents.cancel(pledge.stripePaymentIntentId)
      } catch (stripeErr: any) {
        if (!['already_canceled', 'already_captured'].includes(stripeErr?.code)) {
          console.error('[pledge DELETE] Stripe cancel error', stripeErr)
        }
      }
    }

    const issueId = pledge.issueId.toString()
    await pledge.deleteOne()

    emitIssuePledgeRemoved({ issueId, actorId: token.id, pledgeId }).catch((err: any) => console.warn('[socket]', err?.message ?? err))
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[mobile/issues/pledges DELETE]', err)
    return NextResponse.json({ error: 'Failed to delete pledge' }, { status: 500 })
  }
})
