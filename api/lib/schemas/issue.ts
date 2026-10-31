import { z } from 'zod'
import { variantSchema, avatarSchema, objectIdSchema } from './common'

// ── Shared sub-shapes ─────────────────────────────────────────────────────────

const issueTypeSchema = z.enum(['Clean Up', 'Gardening', 'Hauling'])

const issueImageSchema = z.object({
  id: z.string(),
  variants: z.array(variantSchema),
})

const locationSchema = z.object({
  latitude: z.number(),
  longitude: z.number(),
})

export const applicantSchema = z.object({
  id: z.string(),
  userId: z.string(),
  issueId: z.string(),
  username: z.string().nullable(),
  avatar: avatarSchema,
  createdAt: z.string(),
  status: z.string(),
  rate: z.number().nullable(),
  acceptedAt: z.string().nullable(),
  completionDeadline: z.string().nullable(),
  startedAt: z.string().nullable(),
  startImage: z
    .object({
      id: z.string(),
      variants: z.array(variantSchema),
      createdAt: z.string(),
    })
    .nullable(),
  votes: z.array(z.object({ userId: z.string(), vote: z.string() })),
})

export const pledgeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  issueId: z.string(),
  amount: z.number(),
  createdAt: z.string(),
  username: z.string(),
  avatar: avatarSchema,
  applicantId: z.string().nullable(),
  rescindIfLost: z.boolean(),
  anonymous: z.boolean(),
})

const reportSchema = z.object({
  id: z.string(),
  userId: z.string(),
  username: z.string().nullable(),
  avatar: avatarSchema,
  image: issueImageSchema.nullable(),
  content: z.string(),
  createdAt: z.string(),
})

export const issueSchema = z.object({
  id: z.string(),
  issueType: issueTypeSchema,
  title: z.string().nullable(),
  content: z.string(),
  status: z.enum(['open', 'completed']),
  pledged: z.array(pledgeSchema),
  applicants: z.array(applicantSchema),
  acceptedApplicantId: z.string().nullable(),
  createdAt: z.string(),
  location: locationSchema.optional(),
  locationVisible: z.boolean(),
  completionStatus: z.string().optional(),
  flagged: z.literal(true).optional(),
  images: z.array(issueImageSchema).optional(),
  author: z
    .object({
      id: z.string(),
      username: z.string(),
      avatar: avatarSchema,
    })
    .optional(),
  reports: z.array(reportSchema).optional(),
})

export const completionSchema = z.object({
  id: z.string(),
  issueId: z.string(),
  workerUserId: z.string().nullable(),
  username: z.string().nullable(),
  avatar: avatarSchema,
  images: z.array(issueImageSchema),
  reviews: z.array(z.object({ userId: z.string(), vote: z.string() })),
  status: z.enum(['pending', 'approved', 'denied', 'partial', 'worker_decision']),
  createdAt: z.string(),
  completedAt: z.string().nullable(),
  autoApproveAt: z.string().nullable(),
  payoutAmount: z.number().nullable(),
  totalPledged: z.number().nullable(),
})

// ── Requests ──────────────────────────────────────────────────────────────────

export const createIssueRequestSchema = z.object({
  issueType: issueTypeSchema,
  title: z.string().max(120).optional(),
  content: z.string().max(5000).optional(),
  imageId: objectIdSchema.optional(),
  location: locationSchema.optional(),
  locationVisible: z.boolean().optional(),
})

export const updateIssueRequestSchema = z.object({
  issueType: issueTypeSchema.optional(),
  title: z.string().optional(),
  content: z.string().max(5000).optional(),
  imageId: objectIdSchema.nullable().optional(),
  imageIds: z.array(objectIdSchema).optional(),
  location: locationSchema.nullable().optional(),
  locationVisible: z.boolean().optional(),
})

export const applyRequestSchema = z.object({
  rate: z.number().gt(0).max(10000).optional(),
  acceptPledge: z.boolean().optional(),
})

export const updateRateRequestSchema = z.object({
  rate: z.number().gt(0).max(10000),
})

export const pledgeRequestSchema = z.object({
  amount: z.number().gt(0).max(10000),
  applicantId: objectIdSchema.optional(),
  rescindIfLost: z.boolean().optional(),
  anonymous: z.boolean().optional(),
})

export const reportRequestSchema = z.object({
  imageId: objectIdSchema.nullable().optional(),
  content: z.string().optional(),
})

export const commissionRequestSchema = z.object({
  imageIds: z.array(objectIdSchema).min(1),
})

export const startCommissionRequestSchema = z.object({
  imageId: objectIdSchema.optional(),
})

export const ratingRequestSchema = z.object({
  vote: z.enum(['approve', 'deny']),
  withdrawPledge: z.boolean().optional(),
})

export const workerDecisionRequestSchema = z.object({
  choice: z.enum(['accept_partial', 'extend']),
})

export const flagActionRequestSchema = z.object({
  action: z.enum(['approve', 'dismiss']),
})

export const allocationRequestSchema = z.object({
  amount: z.number().min(0).finite(),
})

// ── Responses ─────────────────────────────────────────────────────────────────

export const issueResponseSchema = z.object({ issue: issueSchema })

export const issuesListResponseSchema = z.object({ issues: z.array(issueSchema) })

export const issueDetailResponseSchema = z.object({
  issue: issueSchema,
  completion: completionSchema.nullable(),
  previousCompletions: z.array(completionSchema),
})

export const issueCounts = z.object({ active: z.number(), completed: z.number() })

export const allocationResponseSchema = z.object({
  allocation: z.number(),
  totalAllocated: z.number(),
  generalPoolShare: z.number(),
})

export const commissionResponseSchema = z.object({
  completion: completionSchema.nullable(),
  myVote: z.enum(['approve', 'deny']).nullable(),
})

export const ratingResponseSchema = z.object({
  vote: z.enum(['approve', 'deny']),
  completion: completionSchema.optional(),
  issue: issueSchema.optional(),
})

export const cancelContractResponseSchema = z.object({
  applicantId: z.string(),
  nextApplicant: applicantSchema.nullable(),
})

export const reassignResponseSchema = z.object({
  applicant: applicantSchema,
  nextApplicant: applicantSchema.nullable(),
})

export const nearbyResponseSchema = z.object({ issue: issueSchema.nullable() })

// ── Inferred types ────────────────────────────────────────────────────────────

export type Issue = z.infer<typeof issueSchema>
export type Applicant = z.infer<typeof applicantSchema>
export type Pledge = z.infer<typeof pledgeSchema>
export type Completion = z.infer<typeof completionSchema>
export type IssueType = z.infer<typeof issueTypeSchema>
export type CreateIssueRequest = z.infer<typeof createIssueRequestSchema>
export type UpdateIssueRequest = z.infer<typeof updateIssueRequestSchema>
export type PledgeRequest = z.infer<typeof pledgeRequestSchema>
export type RatingRequest = z.infer<typeof ratingRequestSchema>
