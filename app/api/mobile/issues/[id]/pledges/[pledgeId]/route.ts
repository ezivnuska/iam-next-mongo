// app/api/mobile/issues/[id]/pledges/[pledgeId]/route.ts
// DELETE — remove a pledge and cancel the associated PaymentIntent (owner only)

import { isValidObjectId } from '@/app/lib/utils/validation'
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { verifyToken } from '@/app/lib/mobile/verifyToken'
import Pledge from '@/app/lib/models/pledge'
import { getIssueAudienceIds, emitIssuePledgeRemoved } from '@/app/lib/socket/emit'
import stripe from '@/app/lib/stripe'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; pledgeId: string }> }
) {
  const tokenPayload = await verifyToken(req)
  if (!tokenPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { pledgeId } = await params

  if (!isValidObjectId(pledgeId)) {
    return NextResponse.json({ error: 'Invalid pledge ID' }, { status: 400 })
  }

  try {
    await connectToDatabase()

    const pledge = await Pledge.findById(pledgeId)
    if (!pledge) {
      return NextResponse.json({ error: 'Pledge not found' }, { status: 404 })
    }

    if (pledge.userId.toString() !== tokenPayload.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (pledge.stripePaymentIntentId) {
      try {
        await stripe.paymentIntents.cancel(pledge.stripePaymentIntentId)
      } catch (stripeErr: any) {
        // Already cancelled or captured — proceed with deletion
        if (!['already_canceled', 'already_captured'].includes(stripeErr?.code)) {
          console.error('[pledge DELETE] Stripe cancel error', stripeErr)
        }
      }
    }

    const issueId = pledge.issueId.toString()
    await pledge.deleteOne()

    getIssueAudienceIds(issueId).then((audience) =>
      emitIssuePledgeRemoved({ issueId, pledgeId }, audience)
    ).catch(() => {})
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[mobile/issues/pledges DELETE]', err)
    return NextResponse.json({ error: 'Failed to delete pledge' }, { status: 500 })
  }
}
