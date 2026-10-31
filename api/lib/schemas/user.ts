import { z } from 'zod'
import { avatarSchema } from './common'

const friendshipStatusSchema = z.enum(['accepted', 'pending_sent', 'pending_received'])

const userFriendshipSchema = z
  .object({
    id: z.string(),
    status: friendshipStatusSchema,
  })
  .nullable()

// ── Response shapes ───────────────────────────────────────────────────────────

export const publicUserSchema = z.object({
  id: z.string(),
  username: z.string(),
  bio: z.string(),
  avatar: avatarSchema,
  friendship: userFriendshipSchema,
})

export const userDetailSchema = publicUserSchema.extend({
  reputation: z.object({ approved: z.number(), total: z.number() }).nullable(),
})

export const usersListResponseSchema = z.object({
  users: z.array(publicUserSchema),
})

export const userDetailResponseSchema = z.object({
  user: userDetailSchema,
})

// ── Profile ───────────────────────────────────────────────────────────────────

export const updateBioRequestSchema = z.object({
  bio: z.string().max(500),
})

export const profileResponseSchema = z.object({
  user: z.object({
    id: z.string(),
    username: z.string(),
    email: z.string(),
    role: z.string(),
    bio: z.string(),
    avatar: avatarSchema,
  }),
})

// ── Inferred types ────────────────────────────────────────────────────────────

export type PublicUser = z.infer<typeof publicUserSchema>
export type UserDetail = z.infer<typeof userDetailSchema>
export type UsersListResponse = z.infer<typeof usersListResponseSchema>
export type UserDetailResponse = z.infer<typeof userDetailResponseSchema>
export type UpdateBioRequest = z.infer<typeof updateBioRequestSchema>
export type ProfileResponse = z.infer<typeof profileResponseSchema>
