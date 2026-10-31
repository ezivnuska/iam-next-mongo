import { z } from 'zod'
import { avatarSchema } from './common'

// ── Tile puzzle ───────────────────────────────────────────────────────────────

export const tileScoreRequestSchema = z.object({
  score: z.string().regex(/^\d{2}:\d{2}$/, 'Score must be in mm:ss format'),
})

const tileScoreEntrySchema = z.object({
  _id: z.string(),
  score: z.string(),
  user: z.object({
    id: z.string(),
    username: z.string(),
    avatar: avatarSchema,
  }),
  createdAt: z.union([z.string(), z.date()]),
})

export const tileScoresResponseSchema = z.array(tileScoreEntrySchema)

export const tileScoreCreateResponseSchema = z.object({
  _id: z.string(),
  score: z.string(),
  user: z.object({ id: z.string(), username: z.string() }),
  createdAt: z.union([z.string(), z.date()]),
})

// ── Tetris ────────────────────────────────────────────────────────────────────

export const tetrisScoreRequestSchema = z.object({
  score: z
    .number()
    .int()
    .min(0)
    .max(10_000_000),
})

const tetrisScoreEntrySchema = z.object({
  _id: z.string(),
  score: z.number(),
  user: z.object({
    id: z.string(),
    username: z.string(),
    avatar: avatarSchema,
  }),
  createdAt: z.string(),
})

export const tetrisScoresResponseSchema = z.array(tetrisScoreEntrySchema)

// ── Inferred types ────────────────────────────────────────────────────────────

export type TileScoreRequest = z.infer<typeof tileScoreRequestSchema>
export type TileScoreEntry = z.infer<typeof tileScoreEntrySchema>
export type TetrisScoreRequest = z.infer<typeof tetrisScoreRequestSchema>
export type TetrisScoreEntry = z.infer<typeof tetrisScoreEntrySchema>
