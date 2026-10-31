import { z } from 'zod'

const cardSchema = z.object({
  id: z.string(),
  brand: z.string(),
  last4: z.string(),
  expMonth: z.number(),
  expYear: z.number(),
})

const partialCardSchema = z
  .object({
    id: z.string(),
    brand: z.string().optional(),
    last4: z.string().optional(),
    expMonth: z.number().optional(),
    expYear: z.number().optional(),
  })
  .nullable()

// ── Requests ──────────────────────────────────────────────────────────────────

export const addPayoutCardRequestSchema = z.object({
  token: z.string(),
})

// ── Responses ─────────────────────────────────────────────────────────────────

export const setupResponseSchema = z.object({ paymentMethod: partialCardSchema })

export const setupInitResponseSchema = z.object({
  setupIntentClientSecret: z.string().nullable(),
  ephemeralKeySecret: z.string(),
  customerId: z.string(),
})

export const connectStatusResponseSchema = z.object({
  connected: z.boolean(),
  payoutsEnabled: z.boolean(),
})

export const connectUrlResponseSchema = z.object({ url: z.string() })

export const payoutCardResponseSchema = z.object({ payoutCard: cardSchema.nullable() })

export const stripeDashboardResponseSchema = z.object({
  pledges: z.array(
    z.object({
      id: z.string(),
      issueId: z.string().nullable(),
      issueType: z.string().nullable(),
      amount: z.number(),
      status: z.enum(['held', 'paid', 'pledged']),
      createdAt: z.union([z.string(), z.date()]),
    })
  ),
  connect: z
    .object({
      availableCents: z.number(),
      pendingCents: z.number(),
      transfers: z.array(
        z.object({
          id: z.string(),
          amountCents: z.number(),
          created: z.number(),
          description: z.string().nullable(),
        })
      ),
    })
    .nullable(),
})

export const stripeConfigResponseSchema = z.object({
  publishableKey: z.string().nullable(),
})

// ── Inferred types ────────────────────────────────────────────────────────────

export type SetupResponse = z.infer<typeof setupResponseSchema>
export type SetupInitResponse = z.infer<typeof setupInitResponseSchema>
export type ConnectStatusResponse = z.infer<typeof connectStatusResponseSchema>
export type StripeDashboardResponse = z.infer<typeof stripeDashboardResponseSchema>
