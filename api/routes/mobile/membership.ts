// api/routes/mobile/membership.ts
// GET  /api/mobile/membership         — current tier + credits (or free defaults)
// POST /api/mobile/membership {tier}  — set membership tier (free | basic | pro)

import { Hono } from 'hono'
import { ZodError } from 'zod'
import { authMiddleware, TokenPayload } from '../../middleware/auth'
import { connectToDatabase } from '@/app/lib/mongoose'
import MembershipModel from '@/app/lib/models/membership'
import { setMembershipRequestSchema } from '../../lib/schemas/membership'

const TIER_CREDITS: Record<'basic' | 'pro', number> = {
  basic: 500,   // $5 in cents
  pro:   1500,  // $15 in cents
}

const FREE_RESPONSE = {
  tier: 'free' as const,
  creditsTotal: 0,
  creditsAllocated: 0,
  creditsRemaining: 0,
  renewalDate: null,
}

function periodEnd(start: Date): Date {
  const end = new Date(start)
  end.setMonth(end.getMonth() + 1)
  return end
}

function serializeMembership(m: any) {
  return {
    tier:             m.tier as 'basic' | 'pro',
    creditsTotal:     m.creditsTotal,
    creditsAllocated: m.creditsAllocated,
    creditsRemaining: Math.max(0, m.creditsTotal - m.creditsAllocated),
    renewalDate:      m.currentPeriodEnd?.toISOString() ?? null,
  }
}

const membershipRoutes = new Hono<{ Variables: { token: TokenPayload } }>()

// ── GET ───────────────────────────────────────────────────────────────────────

membershipRoutes.get('/api/mobile/membership', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    await connectToDatabase()
    const membership = await MembershipModel.findOne({ userId: token.id }).lean()
    if (!membership) return c.json(FREE_RESPONSE)
    return c.json(serializeMembership(membership))
  } catch (err) {
    console.error('[membership GET]', err)
    return c.json({ error: 'Failed to fetch membership' }, 500)
  }
})

// ── POST (set tier) ───────────────────────────────────────────────────────────

membershipRoutes.post('/api/mobile/membership', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    const { tier } = setMembershipRequestSchema.parse(await c.req.json())
    await connectToDatabase()

    if (tier === 'free') {
      // Downgrade: remove membership document
      await MembershipModel.findOneAndDelete({ userId: token.id })
      return c.json(FREE_RESPONSE)
    }

    const paidTier = tier as 'basic' | 'pro'
    const now = new Date()
    const membership = await MembershipModel.findOneAndUpdate(
      { userId: token.id },
      {
        $setOnInsert: {
          userId:             token.id,
          currentPeriodStart: now,
          currentPeriodEnd:   periodEnd(now),
          creditsAllocated:   0,
        },
        $set: {
          tier,
          creditsTotal: TIER_CREDITS[paidTier],
        },
      },
      { upsert: true, new: true }
    ).lean()

    return c.json(serializeMembership(membership!))
  } catch (err) {
    if (err instanceof ZodError)
      return c.json({ error: err.errors[0].message }, 400)
    console.error('[membership POST]', err)
    return c.json({ error: 'Failed to update membership' }, 500)
  }
})

export default membershipRoutes
