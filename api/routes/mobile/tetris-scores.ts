// GET  /api/mobile/tetris-scores — best score per user, highest first
// POST /api/mobile/tetris-scores — save a score for the authed user

import { Hono } from 'hono'
import { ZodError } from 'zod'
import { authMiddleware, TokenPayload } from '../../middleware/auth'
import { connectToDatabase } from '@/app/lib/mongoose'
import UserModel from '@/app/lib/models/user'
import TetrisScoreModel from '@/app/games/tetris/lib/models/tetris-score'
import { tetrisScoreRequestSchema } from '../../lib/schemas/score'

const tetrisScores = new Hono<{ Variables: { token: TokenPayload } }>()

tetrisScores.get('/api/mobile/tetris-scores', authMiddleware, async (c) => {
  try {
    await connectToDatabase()

    const docs = await TetrisScoreModel.aggregate([
      { $group: { _id: '$userId', username: { $last: '$username' }, score: { $max: '$score' } } },
      { $sort: { score: -1 } },
      { $limit: 50 },
    ])

    const userIds = docs.map((d: any) => d._id)
    const users = await UserModel.find({ _id: { $in: userIds } })
      .populate('avatar')
      .lean() as any[]

    const avatarMap = new Map(
      users.map(u => [
        u._id.toString(),
        u.avatar ? { id: u.avatar._id.toString(), variants: u.avatar.variants ?? [] } : null,
      ])
    )

    return c.json(docs.map((d: any) => ({
      _id: d._id,
      score: d.score,
      user: { id: d._id, username: d.username, avatar: avatarMap.get(d._id) ?? null },
      createdAt: '',
    })))
  } catch (err) {
    console.error('[tetris-scores GET]', err)
    return c.json({ error: 'Failed to load scores' }, 500)
  }
})

tetrisScores.post('/api/mobile/tetris-scores', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    const { score } = tetrisScoreRequestSchema.parse(await c.req.json())

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
    if (err instanceof ZodError)
      return c.json({ error: err.errors[0].message }, 400)
    console.error('[tetris-scores POST]', err)
    return c.json({ error: 'Failed to save score' }, 500)
  }
})

export default tetrisScores
