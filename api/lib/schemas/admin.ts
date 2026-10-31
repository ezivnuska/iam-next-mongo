import { z } from 'zod'
import { avatarSchema } from './common'

export const cleanupResponseSchema = z.object({
  deleted: z.object({
    orphanIssueIds: z.array(z.string()),
    pledges: z.number(),
    fees: z.number(),
    applicants: z.number(),
    ratings: z.number(),
  }),
})

export const resetResponseSchema = z.object({
  deleted: z.object({
    issues: z.number(),
    pledges: z.number(),
    fees: z.number(),
    applicants: z.number(),
    ratings: z.number(),
    images: z.number(),
  }),
})

export const feeSummaryResponseSchema = z.object({
  summary: z.object({
    count: z.number(),
    totalAmount: z.number(),
    captured: z.number(),
    pending: z.number(),
  }),
  fees: z.array(
    z.object({
      id: z.string(),
      amount: z.number(),
      createdAt: z.union([z.string(), z.date()]),
      issueId: z.string().nullable(),
      issueType: z.string().nullable(),
      issueStatus: z.string().nullable(),
      feeStatus: z.enum(['pending', 'captured']),
      userId: z.string().nullable(),
      username: z.string().nullable(),
      avatar: avatarSchema,
    })
  ),
})

export type CleanupResponse = z.infer<typeof cleanupResponseSchema>
export type ResetResponse = z.infer<typeof resetResponseSchema>
export type FeeSummaryResponse = z.infer<typeof feeSummaryResponseSchema>
