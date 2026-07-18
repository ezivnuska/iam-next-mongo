import { Hono } from 'hono'
import { authMiddleware, TokenPayload } from '../../middleware/auth'
import { connectToDatabase } from '../../../app/lib/mongoose'
import WordDuelRoomModel from '../../../app/games/word-duel/lib/models/word-duel-room'

const games = new Hono<{ Variables: { token: TokenPayload } }>()

// POST /api/mobile/games — validates that a finished multiplayer game exists in DB
games.post('/api/mobile/games', authMiddleware, async (c) => {
  try {
    const body = await c.req.json()
    const { gameId } = body ?? {}
    if (!gameId || typeof gameId !== 'string') {
      return c.json({ error: 'gameId is required' }, 400)
    }

    await connectToDatabase()
    const room = await WordDuelRoomModel.findOne({ roomId: gameId }).lean()
    if (!room) return c.json({ error: 'Game not found' }, 404)

    return c.json({ ok: true })
  } catch (err) {
    console.error('[games POST]', err)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// POST /api/mobile/games/ai-result — persist a completed solo/AI game round
games.post('/api/mobile/games/ai-result', authMiddleware, async (c) => {
  try {
    const token = c.get('token')
    const body = await c.req.json()
    const { humanUsername, humanScore, cpuScore, winnerId } = body ?? {}

    if (
      typeof humanScore !== 'number' ||
      typeof cpuScore !== 'number' ||
      typeof humanUsername !== 'string'
    ) {
      return c.json({ error: 'Invalid payload' }, 400)
    }

    await connectToDatabase()

    const roomId = `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

    await WordDuelRoomModel.create({
      roomId,
      hostId: token.id,
      hostUsername: humanUsername,
      players: [
        { id: token.id, username: humanUsername, score: humanScore, isCpu: false },
        { id: 'cpu-1', username: 'Computer', score: cpuScore, isCpu: true },
      ],
      maxPlayers: 2,
      status: 'finished',
      phase: 'game_over',
      winnerId: winnerId ?? null,
      roundNumber: 1,
    })

    return c.json({ ok: true })
  } catch (err) {
    console.error('[games POST /ai-result]', err)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

// GET /api/mobile/games/leaderboard — top human players aggregated from finished games
games.get('/api/mobile/games/leaderboard', authMiddleware, async (c) => {
  try {
    await connectToDatabase()

    const entries = await WordDuelRoomModel.aggregate([
      { $match: { status: 'finished', phase: 'game_over' } },
      { $unwind: '$players' },
      { $match: { 'players.isCpu': { $ne: true } } },
      {
        $group: {
          _id: '$players.id',
          username:    { $last: '$players.username' },
          totalScore:  { $sum: '$players.score' },
          gamesPlayed: { $sum: 1 },
          wins: {
            $sum: { $cond: [{ $eq: ['$winnerId', '$players.id'] }, 1, 0] },
          },
        },
      },
      { $sort: { totalScore: -1 } },
      { $limit: 20 },
      {
        $project: {
          _id: 0,
          userId:      '$_id',
          username:    1,
          score:       '$totalScore',
          wins:        1,
          gamesPlayed: 1,
        },
      },
    ])

    const ranked = entries.map((e, i) => ({ ...e, rank: i + 1 }))
    return c.json({ entries: ranked })
  } catch (err) {
    console.error('[games GET /leaderboard]', err)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default games
