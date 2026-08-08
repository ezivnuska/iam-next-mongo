// GET  /api/mobile/tetris-scores — top scores, highest first
// POST /api/mobile/tetris-scores — save a score for the authed user

import { Hono } from 'hono'
import { authMiddleware, TokenPayload } from '../../middleware/auth'
import { connectToDatabase } from '../../../app/lib/mongoose'
import UserModel from '../../../app/lib/models/user'
import TetrisScoreModel from '../../../app/games/tetris/lib/models/tetris-score'

const tetrisScores = new Hono<{ Variables: { token: TokenPayload } }>()

tetrisScores.get('/api/mobile/tetris-scores', authMiddleware, async (c) => {
  try {
    await connectToDatabase()
    const docs = await TetrisScoreModel.find().sort({ score: -1 }).limit(50).lean()

    const userIds = [...new Set(docs.map(d => d.userId))]
    const users = await UserModel.find({ _id: { $in: userIds } })
      .populate('avatar')
      .lean() as any[]

    const avatarMap = new Map(
      users.map(u => [
        u._id.toString(),
        u.avatar
          ? { id: u.avatar._id.toString(), variants: u.avatar.variants ?? [] }
          : null,
      ])
    )

    return c.json(docs.map(d => ({
      _id: (d._id as any).toString(),
      score: d.score,
      user: { id: d.userId, username: d.username, avatar: avatarMap.get(d.userId) ?? null },
      createdAt: d.createdAt,
    })))
  } catch (err) {
    console.error('[tetris-scores GET]', err)
    return c.json({ error: 'Failed to load scores' }, 500)
  }
})

tetrisScores.post('/api/mobile/tetris-scores', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    const { score } = await c.req.json()
    if (typeof score !== 'number' || !Number.isInteger(score) || score < 0)
      return c.json({ error: 'score must be a non-negative integer' }, 400)

    await connectToDatabase()
    const user = await UserModel.findById(token.id, { username: 1 }).lean() as any
    if (!user) return c.json({ error: 'User not found' }, 404)

    const doc = await TetrisScoreModel.create({ userId: token.id, username: user.username, score })
    return c.json({
      _id: (doc._id as any).toString(),
      score: doc.score,
      user: { id: doc.userId, username: doc.username, avatar: null },
      createdAt: doc.createdAt,
    })
  } catch (err) {
    console.error('[tetris-scores POST]', err)
    return c.json({ error: 'Failed to save score' }, 500)
  }
})

export default tetrisScores
