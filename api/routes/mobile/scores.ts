// api/routes/mobile/scores.ts
// GET    /api/mobile/scores  — all scores sorted fastest first (for in-game display)
// POST   /api/mobile/scores  — save a completion time for the authed user
// DELETE /api/mobile/scores  — clear all scores for the authed user

import { Hono } from 'hono'
import { authMiddleware, TokenPayload } from '../../middleware/auth'
import { connectToDatabase } from '../../../app/lib/mongoose'
import UserModel from '../../../app/lib/models/user'
import TileScoreModel from '../../../app/games/tiles/lib/models/tile-score'

const scores = new Hono<{ Variables: { token: TokenPayload } }>()

scores.get('/api/mobile/scores', authMiddleware, async (c) => {
  try {
    await connectToDatabase()
    const docs = await TileScoreModel.find().sort({ score: 1 }).limit(50).lean()
    return c.json(docs.map(d => ({
      _id: (d._id as any).toString(),
      score: d.score,
      user: { id: d.userId, username: d.username },
      createdAt: d.createdAt,
    })))
  } catch (err) {
    console.error('[scores GET]', err)
    return c.json({ error: 'Failed to load scores' }, 500)
  }
})

scores.post('/api/mobile/scores', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    const { score } = await c.req.json()
    if (typeof score !== 'string' || !/^\d{2}:\d{2}$/.test(score))
      return c.json({ error: 'score must be a "mm:ss" string' }, 400)

    await connectToDatabase()
    const user = await UserModel.findById(token.id, { username: 1 }).lean() as any
    if (!user) return c.json({ error: 'User not found' }, 404)

    const doc = await TileScoreModel.create({ userId: token.id, username: user.username, score })
    return c.json({
      _id: (doc._id as any).toString(),
      score: doc.score,
      user: { id: doc.userId, username: doc.username },
      createdAt: doc.createdAt,
    })
  } catch (err) {
    console.error('[scores POST]', err)
    return c.json({ error: 'Failed to save score' }, 500)
  }
})

scores.delete('/api/mobile/scores', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    await connectToDatabase()
    await TileScoreModel.deleteMany({ userId: token.id })
    return c.json({ ok: true })
  } catch (err) {
    console.error('[scores DELETE]', err)
    return c.json({ error: 'Failed to clear scores' }, 500)
  }
})

export default scores
