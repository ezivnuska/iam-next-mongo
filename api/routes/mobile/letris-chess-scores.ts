// GET  /api/mobile/letris-chess-scores — best score per user, highest first
// POST /api/mobile/letris-chess-results — save game result for both players

import { Hono } from 'hono'
import { authMiddleware, TokenPayload } from '../../middleware/auth'
import { connectToDatabase } from '../../../app/lib/mongoose'
import UserModel from '../../../app/lib/models/user'
import LetrisChessScoreModel from '../../../app/games/letris-chess/lib/models/letris-chess-score'

const letrisChessScores = new Hono<{ Variables: { token: TokenPayload } }>()

letrisChessScores.get('/api/mobile/letris-chess-scores', authMiddleware, async (c) => {
  try {
    await connectToDatabase()

    const docs = await LetrisChessScoreModel.aggregate([
      {
        $group: {
          _id:      '$userId',
          username: { $last: '$username' },
          score:    { $max: '$score' },
          wins:     { $sum: { $cond: ['$won', 1, 0] } },
          games:    { $sum: 1 },
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
      wins:      d.wins,
      games:     d.games,
      user:      { id: d._id, username: d.username, avatar: avatarMap.get(d._id) ?? null },
      createdAt: '',
    })))
  } catch (err) {
    console.error('[letris-chess-scores GET]', err)
    return c.json({ error: 'Failed to load scores' }, 500)
  }
})

letrisChessScores.post('/api/mobile/letris-chess-results', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    const body = await c.req.json()
    const { players, winnerId } = body ?? {}

    if (!Array.isArray(players) || players.length < 1) {
      return c.json({ error: 'players array is required' }, 400)
    }

    await connectToDatabase()

    // Verify the authed user is one of the players
    const myPlayer = players.find((p: any) => p.userId === token.id)
    if (!myPlayer) return c.json({ error: 'Unauthorized' }, 403)

    await LetrisChessScoreModel.insertMany(
      players.map((p: any) => ({
        userId:   p.userId,
        username: p.username,
        score:    p.score ?? 0,
        won:      winnerId === p.userId,
      }))
    )

    return c.json({ ok: true })
  } catch (err) {
    console.error('[letris-chess-results POST]', err)
    return c.json({ error: 'Failed to save result' }, 500)
  }
})

export default letrisChessScores
