import { z } from 'zod'
import { variantSchema, objectIdSchema } from './common'

// ── Shared image shape ────────────────────────────────────────────────────────

export const imageSchema = z.object({
  id: z.string(),
  userId: z.string(),
  username: z.string(),
  alt: z.string(),
  variants: z.array(variantSchema),
  likes: z.array(z.string()),
  likedByCurrentUser: z.boolean(),
  createdAt: z.string(),
})

// ── Requests ──────────────────────────────────────────────────────────────────

export const patchAvatarRequestSchema = z.object({
  imageId: objectIdSchema.nullable(),
})

// ── Responses ─────────────────────────────────────────────────────────────────

export const avatarUploadResponseSchema = z.object({
  avatar: z.object({ id: z.string(), variants: z.array(variantSchema) }),
})

export const imagesListResponseSchema = z.object({
  images: z.array(imageSchema),
})

export const imageUploadResponseSchema = z.object({ image: imageSchema })

export const imageDeleteResponseSchema = z.object({
  ok: z.literal(true),
  avatarCleared: z.boolean(),
})

export const imageLikeResponseSchema = z.object({
  liked: z.boolean(),
  likeCount: z.number(),
})

// ── Inferred types ────────────────────────────────────────────────────────────

export type Image = z.infer<typeof imageSchema>
export type PatchAvatarRequest = z.infer<typeof patchAvatarRequestSchema>
export type ImagesListResponse = z.infer<typeof imagesListResponseSchema>
export type ImageUploadResponse = z.infer<typeof imageUploadResponseSchema>
export type ImageLikeResponse = z.infer<typeof imageLikeResponseSchema>
