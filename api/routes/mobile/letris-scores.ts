// GET  /api/mobile/letris-scores — best score per user, highest first
// POST /api/mobile/letris-scores — save a score for the authed user

import { Hono } from 'hono'
import { authMiddleware, TokenPayload } from '../../middleware/auth'
import { connectToDatabase } from '../../../app/lib/mongoose'
import UserModel from '../../../app/lib/models/user'
import LetrisScoreModel from '../../../app/games/letris/lib/models/letris-score'

const letrisScores = new Hono<{ Variables: { token: TokenPayload } }>()

letrisScores.get('/api/mobile/letris-scores', authMiddleware, async (c) => {
  try {
    await connectToDatabase()

    const docs = await LetrisScoreModel.aggregate([
      {
        $group: {
          _id:      '$userId',
          username: { $last: '$username' },
          score:    { $max: '$score' },
        },
      },
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
        u.avatar
          ? { id: u.avatar._id.toString(), variants: u.avatar.variants ?? [] }
          : null,
      ])
    )

    return c.json(docs.map((d: any) => ({
      _id:       d._id,
      score:     d.score,
      user:      { id: d._id, username: d.username, avatar: avatarMap.get(d._id) ?? null },
      createdAt: '',
    })))
  } catch (err) {
    console.error('[letris-scores GET]', err)
    return c.json({ error: 'Failed to load scores' }, 500)
  }
})

letrisScores.post('/api/mobile/letris-scores', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    const { score } = await c.req.json()
    if (typeof score !== 'number' || !Number.isInteger(score) || score < 0 || score > 10_000_000)
      return c.json({ error: 'score must be a non-negative integer no greater than 10,000,000' }, 400)

    await connectToDatabase()
    const user = await UserModel.findById(token.id, { username: 1 }).lean() as any
    if (!user) return c.json({ error: 'User not found' }, 404)

    const doc = await LetrisScoreModel.create({ userId: token.id, username: user.username, score })
    return c.json({
      _id:       (doc._id as any).toString(),
      score:     doc.score,
      user:      { id: doc.userId, username: doc.username, avatar: null },
      createdAt: doc.createdAt,
    })
  } catch (err) {
    console.error('[letris-scores POST]', err)
    return c.json({ error: 'Failed to save score' }, 500)
  }
})

export default letrisScores
