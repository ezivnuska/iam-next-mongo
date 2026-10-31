import { z } from 'zod'

export const objectIdSchema = z.string().regex(/^[0-9a-f]{24}$/, 'Invalid ObjectId')

export const variantSchema = z.object({
  size: z.string(),
  filename: z.string(),
  width: z.number(),
  height: z.number(),
  url: z.string(),
})

export const avatarSchema = z
  .object({
    id: z.string(),
    variants: z.array(variantSchema),
  })
  .nullable()

export type Variant = z.infer<typeof variantSchema>
export type Avatar = z.infer<typeof avatarSchema>
