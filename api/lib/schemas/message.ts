import { z } from 'zod'
import { objectIdSchema } from './common'

// ── Requests ──────────────────────────────────────────────────────────────────

export const sendMessageRequestSchema = z.object({
  toId: objectIdSchema,
  text: z.string().min(1, 'Message cannot be empty').max(2000, 'Message too long'),
})

// ── Inferred types ────────────────────────────────────────────────────────────

export type SendMessageRequest = z.infer<typeof sendMessageRequestSchema>
