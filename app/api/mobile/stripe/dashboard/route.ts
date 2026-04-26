// app/api/mobile/stripe/dashboard/route.ts
// GET — return current user's Stripe dashboard data (pledges + Connect balance/transfers)

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { verifyToken } from '@/app/lib/mobile/verifyToken'
import stripe from '@/app/lib/stripe'
import Pledge from '@/app/lib/models/pledge'
import UserModel from '@/app/lib/models/user'
import '@/app/lib/models/need'

export async function GET(req: NextRequest) {
  const tokenPayload = await verifyToken(req)
  if (!tokenPayload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    await connectToDatabase()

    const user = await UserModel.findById(tokenPayload.id).lean() as any

    // Pledges with need title + status
    const rawPledges = await Pledge.find({ userId: tokenPayload.id })
      .populate({ path: 'needId', select: 'title status' })
      .sort({ createdAt: -1 })
      .lean() as any[]

    const pledges = rawPledges.map((p) => {
      const need = p.needId as any
      let status: 'held' | 'paid' | 'pledged'
      if (need?.status === 'completed') status = 'paid'
      else if (p.stripePaymentIntentId) status = 'held'
      else status = 'pledged'
      return {
        id: p._id.toString(),
        needId: need?._id?.toString() ?? null,
        needTitle: need?.title ?? 'Untitled',
        amount: p.amount,
        status,
        createdAt: p.createdAt,
      }
    })

    // Connect account balance + recent transfers
    let connect: {
      availableCents: number
      pendingCents: number
      transfers: { id: string; amountCents: number; created: number; description: string | null }[]
    } | null = null

    if (user?.stripeAccountId) {
      try {
        const [balance, transfers] = await Promise.all([
          stripe.balance.retrieve({}, { stripeAccount: user.stripeAccountId }),
          stripe.transfers.list({ destination: user.stripeAccountId, limit: 20 }),
        ])
        connect = {
          availableCents: balance.available.reduce((sum, b) => sum + b.amount, 0),
          pendingCents: balance.pending.reduce((sum, b) => sum + b.amount, 0),
          transfers: transfers.data.map((t) => ({
            id: t.id,
            amountCents: t.amount,
            created: t.created,
            description: t.description ?? null,
          })),
        }
      } catch (err: any) {
        if (err?.code === 'resource_missing' || err?.code === 'account_invalid') {
          await UserModel.findByIdAndUpdate(tokenPayload.id, {
            $unset: { stripeAccountId: '', stripeAccountEnabled: '' },
          })
        } else {
          throw err
        }
      }
    }

    return NextResponse.json({ pledges, connect })
  } catch (err: any) {
    console.error('[stripe/dashboard GET]', err)
    return NextResponse.json({ error: err?.message ?? 'Failed to load dashboard' }, { status: 500 })
  }
}
