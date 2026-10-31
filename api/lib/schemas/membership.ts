import { z } from 'zod'

export const membershipTierSchema = z.enum(['free', 'basic', 'pro'])

export const setMembershipRequestSchema = z.object({
  tier: membershipTierSchema,
})

export const membershipResponseSchema = z.object({
  tier: membershipTierSchema,
  creditsTotal: z.number(),
  creditsAllocated: z.number(),
  creditsRemaining: z.number(),
  renewalDate: z.string().nullable(),
})

export type MembershipTier = z.infer<typeof membershipTierSchema>
export type SetMembershipRequest = z.infer<typeof setMembershipRequestSchema>
export type MembershipResponse = z.infer<typeof membershipResponseSchema>
