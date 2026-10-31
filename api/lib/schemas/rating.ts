import { z } from 'zod'

export const ratingsResponseSchema = z.object({
  approved: z.number(),
  total: z.number(),
  approvalPct: z.number().nullable(),
  ratings: z.array(
    z.object({
      id: z.string(),
      vote: z.enum(['approve', 'deny']),
      issueType: z.string().nullable(),
      createdAt: z.string().nullable(),
    })
  ),
})

export type RatingsResponse = z.infer<typeof ratingsResponseSchema>
