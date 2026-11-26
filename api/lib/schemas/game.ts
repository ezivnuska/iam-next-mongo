import { z } from 'zod'
import { avatarSchema } from './common'

// ── Leaderboard ───────────────────────────────────────────────────────────────

const tilePuzzleEntrySchema = z.object({
  userId: z.string(),
  username: z.string(),
  bestTime: z.string(),
  timesPlayed: z.number(),
  game: z.literal('tile-puzzle'),
  rank: z.number(),
  avatar: avatarSchema,
})

const tetrisEntrySchema = z.object({
  userId: z.string(),
  username: z.string(),
  bestScore: z.number(),
  gamesPlayed: z.number(),
  game: z.literal('tetris'),
  rank: z.number(),
  avatar: avatarSchema,
})

export const leaderboardResponseSchema = z.object({
  tileEntries: z.array(tilePuzzleEntrySchema),
  tetrisEntries: z.array(tetrisEntrySchema),
})

// ── Inferred types ────────────────────────────────────────────────────────────

export type TilePuzzleEntry = z.infer<typeof tilePuzzleEntrySchema>
export type TetrisEntry = z.infer<typeof tetrisEntrySchema>
export type LeaderboardResponse = z.infer<typeof leaderboardResponseSchema>
