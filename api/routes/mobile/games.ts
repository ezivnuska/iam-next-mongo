// POST /api/mobile/games            — validate a finished multiplayer game
// POST /api/mobile/games/ai-result  — persist a completed solo/AI game round
// GET  /api/mobile/games/leaderboard — top players aggregated from all games

import { Hono } from 'hono'
import { ZodError } from 'zod'
import { authMiddleware, TokenPayload } from '../../middleware/auth'
import { connectToDatabase } from '@/app/lib/mongoose'
import WordDuelRoomModel from '@/app/games/word-duel/lib/models/word-duel-room'
import WordDuelScoreModel from '@/app/games/word-duel/lib/models/word-duel-score'
import TileScoreModel from '@/app/games/tiles/lib/models/tile-score'
import TetrisScoreModel from '@/app/games/tetris/lib/models/tetris-score'
import UserModel from '@/app/lib/models/user'
import { joinGameRequestSchema, aiResultRequestSchema } from '../../lib/schemas/game'

const games = new Hono<{ Variables: { token: TokenPayload } }>()

games.post('/api/mobile/games', authMiddleware, async (c) => {
  try {
    const { gameId } = joinGameRequestSchema.parse(await c.req.json())

    await connectToDatabase()
    const room = await WordDuelRoomModel.findOne({ roomId: gameId }).lean()
    if (!room) return c.json({ error: 'Game not found' }, 404)

    return c.json({ ok: true })
  } catch (err) {
    if (err instanceof ZodError)
      return c.json({ error: err.errors[0].message }, 400)
    console.error('[games POST]', err)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

games.post('/api/mobile/games/ai-result', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    const { humanUsername, humanScore, cpuScore, winnerId } = aiResultRequestSchema.parse(await c.req.json())

    await connectToDatabase()

    const roomId = `ai-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`

    await Promise.all([
      WordDuelRoomModel.create({
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
      }),
      WordDuelScoreModel.create({
        userId: token.id,
        username: humanUsername,
        score: humanScore,
        won: winnerId === token.id,
      }),
    ])

    return c.json({ ok: true })
  } catch (err) {
    if (err instanceof ZodError)
      return c.json({ error: err.errors[0].message }, 400)
    console.error('[games POST /ai-result]', err)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

games.get('/api/mobile/games/leaderboard', authMiddleware, async (c) => {
  try {
    await connectToDatabase()

    const [wordDuelEntries, tileEntries, tetrisEntries] = await Promise.all([
      WordDuelScoreModel.aggregate([
        {
          $group: {
            _id: '$userId',
            username: { $last: '$username' },
            totalScore: { $sum: '$score' },
            gamesPlayed: { $sum: 1 },
            wins: { $sum: { $cond: ['$won', 1, 0] } },
          },
        },
        { $sort: { totalScore: -1 } },
        { $limit: 20 },
        {
          $project: {
            _id: 0,
            userId: '$_id',
            username: 1,
            score: '$totalScore',
            wins: 1,
            gamesPlayed: 1,
            game: { $literal: 'word-duel' },
          },
        },
      ]),
      TileScoreModel.aggregate([
        {
          $group: {
            _id: '$userId',
            username: { $last: '$username' },
            bestTime: { $min: '$score' },
            timesPlayed: { $sum: 1 },
          },
        },
        { $sort: { bestTime: 1 } },
        { $limit: 20 },
        {
          $project: {
            _id: 0,
            userId: '$_id',
            username: 1,
            bestTime: 1,
            timesPlayed: 1,
            game: { $literal: 'tile-puzzle' },
          },
        },
      ]),
      TetrisScoreModel.aggregate([
        {
          $group: {
            _id: '$userId',
            username: { $last: '$username' },
            bestScore: { $max: '$score' },
            gamesPlayed: { $sum: 1 },
          },
        },
        { $sort: { bestScore: -1 } },
        { $limit: 20 },
        {
          $project: {
            _id: 0,
            userId: '$_id',
            username: 1,
            bestScore: 1,
            gamesPlayed: 1,
            game: { $literal: 'tetris' },
          },
        },
      ]),
    ])

    const allUserIds = [...new Set([
      ...wordDuelEntries.map((e: any) => e.userId),
      ...tileEntries.map((e: any) => e.userId),
      ...tetrisEntries.map((e: any) => e.userId),
    ])]

    const users = await UserModel.find({ _id: { $in: allUserIds } })
      .populate('avatar')
      .lean() as any[]

    const avatarMap = new Map(
      users.map(u => [
        u._id.toString(),
        u.avatar ? { id: u.avatar._id.toString(), variants: u.avatar.variants ?? [] } : null,
      ])
    )

    return c.json({
      entries: wordDuelEntries.map((e: any, i: number) => ({ ...e, rank: i + 1, avatar: avatarMap.get(e.userId) ?? null })),
      tileEntries: tileEntries.map((e: any, i: number) => ({ ...e, rank: i + 1, avatar: avatarMap.get(e.userId) ?? null })),
      tetrisEntries: tetrisEntries.map((e: any, i: number) => ({ ...e, rank: i + 1, avatar: avatarMap.get(e.userId) ?? null })),
    })
  } catch (err) {
    console.error('[games GET /leaderboard]', err)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default games
