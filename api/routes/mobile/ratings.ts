// api/routes/mobile/ratings.ts
// GET /api/mobile/ratings — current user's received ratings as a worker

import { Hono } from 'hono'
import { authMiddleware, TokenPayload } from '../../middleware/auth'
import { connectToDatabase } from '../../../app/lib/mongoose'
import Rating from '../../../app/lib/models/rating'
import '../../../app/lib/models/issue'

const ratings = new Hono<{ Variables: { token: TokenPayload } }>()

const REPUTATION_WINDOW = 100

ratings.get('/api/mobile/ratings', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    await connectToDatabase()

    const raw = await Rating.find({ workerId: token.id })
      .sort({ createdAt: -1 })
      .populate({ path: 'issueId', select: 'issueType' })
      .lean() as any[]

    const window = raw.slice(0, REPUTATION_WINDOW)
    const total = window.length
    const approved = window.filter((r) => r.vote === 'approve').length
    const approvalPct = total === 0 ? null : Math.round((approved / total) * 100)

    const ratingList = raw.map((r) => ({
      id: r._id.toString(),
      vote: r.vote as 'approve' | 'deny',
      issueType: r.issueId?.issueType ?? null,
      createdAt: r.createdAt?.toISOString() ?? null,
    }))

    return c.json({ approved, total, approvalPct, ratings: ratingList })
  } catch (err) {
    console.error('[mobile/ratings GET]', err)
    return c.json({ error: 'Failed to fetch ratings' }, 500)
  }
})

export default ratings
