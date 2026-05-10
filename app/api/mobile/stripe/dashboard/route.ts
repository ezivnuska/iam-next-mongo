// app/api/mobile/stripe/dashboard/route.ts
// GET — return current user's Stripe dashboard data (pledges + Connect balance/transfers)

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import stripe from '@/app/lib/stripe'
import Pledge from '@/app/lib/models/pledge'
import Applicant from '@/app/lib/models/applicant'
import UserModel from '@/app/lib/models/user'
import '@/app/lib/models/issue'

export const GET = withAuth(async (req, token) => {
  try {
    await connectToDatabase()
    const user = await UserModel.findById(token.id).lean() as any

    const rawPledges = await Pledge.find({ userId: token.id })
      .populate({ path: 'issueId', select: 'issueType status' })
      .sort({ createdAt: -1 })
      .lean() as any[]

    // Batch-check which issues have an accepted applicant so status is accurate
    const activeIssueIds = rawPledges
      .map((p) => (p.issueId as any)?._id)
      .filter(Boolean)
    const acceptedApplicants = activeIssueIds.length > 0
      ? await Applicant.find({ issueId: { $in: activeIssueIds }, status: 'accepted' }).select('issueId').lean()
      : []
    const acceptedIssueIds = new Set((acceptedApplicants as any[]).map((a) => a.issueId.toString()))

    const pledges = rawPledges.map((p) => {
      const need = p.issueId as any
      const issueId = need?._id?.toString() ?? null
      let status: 'held' | 'paid' | 'pledged'
      if (need?.status === 'completed') status = 'paid'
      else if (issueId && acceptedIssueIds.has(issueId)) status = 'held'
      else status = 'pledged'
      return {
        id: p._id.toString(),
        issueId,
        issueType: need?.issueType ?? null,
        amount: p.amount,
        status,
        createdAt: p.createdAt,
      }
    })

    let connect: {
      availableCents: number
      pendingCents: number
      transfers: { id: string; amountCents: number; created: number; description: string | null }[]
    } | null = null

    if (user?.stripeAccountId) {
      const [balanceResult, transfersResult] = await Promise.allSettled([
        stripe.balance.retrieve({}, { stripeAccount: user.stripeAccountId }),
        stripe.transfers.list({ destination: user.stripeAccountId, limit: 20 }),
      ])

      const staleAccount = [balanceResult, transfersResult].some((r) => {
        if (r.status !== 'rejected') return false
        const code = (r.reason as any)?.code
        return code === 'resource_missing' || code === 'account_invalid'
      })

      if (staleAccount) {
        await UserModel.findByIdAndUpdate(token.id, { $unset: { stripeAccountId: '', stripeAccountEnabled: '' } })
      } else {
        const balance = balanceResult.status === 'fulfilled' ? balanceResult.value : null
        const transferData = transfersResult.status === 'fulfilled' ? transfersResult.value.data : []
        if (balanceResult.status === 'rejected')
          console.error('[stripe/dashboard] balance.retrieve failed:', (balanceResult as any).reason?.message)
        if (transfersResult.status === 'rejected')
          console.error('[stripe/dashboard] transfers.list failed:', (transfersResult as any).reason?.message)
        connect = {
          availableCents: balance?.available.reduce((sum, b) => sum + b.amount, 0) ?? 0,
          pendingCents: balance?.pending.reduce((sum, b) => sum + b.amount, 0) ?? 0,
          transfers: transferData.map((t) => ({ id: t.id, amountCents: t.amount, created: t.created, description: t.description ?? null })),
        }
      }
    }

    return NextResponse.json({ pledges, connect })
  } catch (err: any) {
    console.error('[stripe/dashboard GET]', err)
    return NextResponse.json({ error: err?.message ?? 'Failed to load dashboard' }, { status: 500 })
  }
})
