import { z } from 'zod'
import { avatarSchema } from './common'

// ── Requests ──────────────────────────────────────────────────────────────────

export const joinGameRequestSchema = z.object({ gameId: z.string() })

export const aiResultRequestSchema = z.object({
  humanUsername: z.string(),
  humanScore: z.number(),
  cpuScore: z.number(),
  winnerId: z.string().nullable().optional(),
})

// ── Leaderboard ───────────────────────────────────────────────────────────────

const wordDuelEntrySchema = z.object({
  userId: z.string(),
  username: z.string(),
  score: z.number(),
  wins: z.number(),
  gamesPlayed: z.number(),
  game: z.literal('word-duel'),
  rank: z.number(),
  avatar: avatarSchema,
})

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
  entries: z.array(wordDuelEntrySchema),
  tileEntries: z.array(tilePuzzleEntrySchema),
  tetrisEntries: z.array(tetrisEntrySchema),
})

// ── Inferred types ────────────────────────────────────────────────────────────

export type JoinGameRequest = z.infer<typeof joinGameRequestSchema>
export type AiResultRequest = z.infer<typeof aiResultRequestSchema>
export type WordDuelEntry = z.infer<typeof wordDuelEntrySchema>
export type TilePuzzleEntry = z.infer<typeof tilePuzzleEntrySchema>
export type TetrisEntry = z.infer<typeof tetrisEntrySchema>
export type LeaderboardResponse = z.infer<typeof leaderboardResponseSchema>
