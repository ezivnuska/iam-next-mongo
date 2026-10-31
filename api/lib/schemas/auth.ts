import { z } from 'zod'
import { avatarSchema } from './common'

// ── Requests ──────────────────────────────────────────────────────────────────

export const loginRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const registerRequestSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  username: z
    .string()
    .min(2)
    .max(20)
    .regex(/^[a-zA-Z0-9_.-]{2,20}$/, 'Username may only contain letters, numbers, underscores, hyphens, and periods'),
})

// ── Responses ─────────────────────────────────────────────────────────────────

export const tokenResponseSchema = z.object({ token: z.string() })

export const meResponseSchema = z.object({
  id: z.string(),
  username: z.string(),
  email: z.string(),
  role: z.string(),
  bio: z.string().optional(),
  avatar: avatarSchema,
  reputation: z.object({ approved: z.number(), total: z.number() }).nullable(),
})

// ── Inferred types ────────────────────────────────────────────────────────────

export type LoginRequest = z.infer<typeof loginRequestSchema>
export type RegisterRequest = z.infer<typeof registerRequestSchema>
export type TokenResponse = z.infer<typeof tokenResponseSchema>
export type MeResponse = z.infer<typeof meResponseSchema>
