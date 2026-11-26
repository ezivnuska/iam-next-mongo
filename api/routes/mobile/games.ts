// GET  /api/mobile/games/leaderboard — top players aggregated from all games

import { Hono } from 'hono'
import { authMiddleware, TokenPayload } from '../../middleware/auth'
import { connectToDatabase } from '@/app/lib/mongoose'
import TileScoreModel from '@/api/models/tile-score'
import TetrisScoreModel from '@/api/models/tetris-score'
import UserModel from '@/app/lib/models/user'

const games = new Hono<{ Variables: { token: TokenPayload } }>()

games.get('/api/mobile/games/leaderboard', authMiddleware, async (c) => {
  try {
    await connectToDatabase()

    const [tileEntries, tetrisEntries] = await Promise.all([
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
      tileEntries: tileEntries.map((e: any, i: number) => ({ ...e, rank: i + 1, avatar: avatarMap.get(e.userId) ?? null })),
      tetrisEntries: tetrisEntries.map((e: any, i: number) => ({ ...e, rank: i + 1, avatar: avatarMap.get(e.userId) ?? null })),
    })
  } catch (err) {
    console.error('[games GET /leaderboard]', err)
    return c.json({ error: 'Internal server error' }, 500)
  }
})

export default games
