// api/routes/mobile/ratings.ts
// GET /api/mobile/ratings — current user's received ratings as a worker

import { Hono } from 'hono'
import { authMiddleware, TokenPayload } from '../../middleware/auth'
import { connectToDatabase } from '../../../app/lib/mongoose'
import Rating from '../../../app/lib/models/rating'
import '../../../app/lib/models/issue'

const ratings = new Hono<{ Variables: { token: TokenPayload } }>()

ratings.get('/api/mobile/ratings', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    await connectToDatabase()

    const raw = await Rating.find({ workerId: token.id })
      .sort({ createdAt: -1 })
      .populate({ path: 'issueId', select: 'issueType' })
      .lean() as any[]

    const count = raw.length
    const average = count === 0
      ? null
      : Math.round((raw.reduce((s, r) => s + r.score, 0) / count) * 10) / 10

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const r of raw) distribution[r.score] = (distribution[r.score] ?? 0) + 1

    const ratingList = raw.map((r) => ({
      id: r._id.toString(),
      score: r.score,
      issueType: r.issueId?.issueType ?? null,
      createdAt: r.createdAt?.toISOString() ?? null,
    }))

    return c.json({ average, count, distribution, ratings: ratingList })
  } catch (err) {
    console.error('[mobile/ratings GET]', err)
    return c.json({ error: 'Failed to fetch ratings' }, 500)
  }
})

export default ratings
