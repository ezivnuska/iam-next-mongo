import { z } from 'zod'
import { objectIdSchema } from './common'

// ── Requests ──────────────────────────────────────────────────────────────────

export const createFriendshipRequestSchema = z.object({
  recipientId: objectIdSchema,
})

export const patchFriendshipRequestSchema = z.object({
  action: z.enum(['accept', 'reject']),
})

// ── Responses ─────────────────────────────────────────────────────────────────

export const friendshipResponseSchema = z.object({
  friendship: z.object({
    id: z.string(),
    status: z.enum(['accepted', 'pending_sent', 'none']),
  }),
})

export const okResponseSchema = z.object({ ok: z.literal(true) })

// ── Inferred types ────────────────────────────────────────────────────────────

export type CreateFriendshipRequest = z.infer<typeof createFriendshipRequestSchema>
export type PatchFriendshipRequest = z.infer<typeof patchFriendshipRequestSchema>
export type FriendshipResponse = z.infer<typeof friendshipResponseSchema>
