import { z } from 'zod'

export const registerPushTokenRequestSchema = z.object({
  token: z.string().startsWith('ExponentPushToken', 'Token must be an Expo push token'),
})

export const sendNotificationRequestSchema = z.object({
  userId: z.string(),
  title: z.string().max(100),
  body: z.string().max(500),
})

export const challengeNotificationRequestSchema = z.object({
  toUserId: z.string(),
  roomId: z.string(),
})

export type RegisterPushTokenRequest = z.infer<typeof registerPushTokenRequestSchema>
export type SendNotificationRequest = z.infer<typeof sendNotificationRequestSchema>
export type ChallengeNotificationRequest = z.infer<typeof challengeNotificationRequestSchema>
