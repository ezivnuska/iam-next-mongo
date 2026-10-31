// api/routes/mobile/notifications.ts
// POST   /api/mobile/notifications/token  — register Expo push token
// DELETE /api/mobile/notifications/token  — clear push token on logout
// POST   /api/mobile/notifications/notify — send push notification to a user

import { Hono } from 'hono'
import { ZodError } from 'zod'
import { authMiddleware, TokenPayload } from '../../middleware/auth'
import { connectToDatabase } from '@/app/lib/mongoose'
import { isValidObjectId } from '@/app/lib/utils/validation'
import UserModel from '@/app/lib/models/user'
import {
  registerPushTokenRequestSchema,
  sendNotificationRequestSchema,
  challengeNotificationRequestSchema,
} from '../../lib/schemas/notification'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

const notifications = new Hono<{ Variables: { token: TokenPayload } }>()

notifications.post('/api/mobile/notifications/token', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    const { token: pushToken } = registerPushTokenRequestSchema.parse(await c.req.json())

    await connectToDatabase()
    await UserModel.findByIdAndUpdate(token.id, { expoPushToken: pushToken })
    return c.json({ ok: true })
  } catch (err) {
    if (err instanceof ZodError)
      return c.json({ error: err.errors[0].message }, 400)
    console.error('[notifications/token POST]', err)
    return c.json({ error: 'Failed to register token' }, 500)
  }
})

notifications.delete('/api/mobile/notifications/token', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    await connectToDatabase()
    await UserModel.findByIdAndUpdate(token.id, { $unset: { expoPushToken: '' } })
    return c.json({ ok: true })
  } catch (err) {
    console.error('[notifications/token DELETE]', err)
    return c.json({ error: 'Failed to clear token' }, 500)
  }
})

const STRIP_TAGS = (s: string) => s.replace(/<[^>]*>/g, '').trim()

notifications.post('/api/mobile/notifications/notify', authMiddleware, async (c) => {
  try {
    const { userId, title, body } = sendNotificationRequestSchema.parse(await c.req.json())

    const safeTitle = STRIP_TAGS(title)
    const safeBody = STRIP_TAGS(body)
    if (!safeTitle || !safeBody)
      return c.json({ error: 'Invalid notification content' }, 400)

    await connectToDatabase()
    const user = await UserModel.findById(userId, { expoPushToken: 1 }).lean() as any
    if (!user?.expoPushToken) return c.json({ ok: true })

    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ to: user.expoPushToken, title: safeTitle, body: safeBody, sound: 'default' }),
    })

    return c.json({ ok: true })
  } catch (err) {
    if (err instanceof ZodError)
      return c.json({ error: err.errors[0].message }, 400)
    console.error('[notifications/notify POST]', err)
    return c.json({ error: 'Failed to send notification' }, 500)
  }
})

notifications.post('/api/mobile/notifications/challenge', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    const { toUserId, roomId } = challengeNotificationRequestSchema.parse(await c.req.json())

    await connectToDatabase()
    const [sender, target] = await Promise.all([
      UserModel.findById(token.id, { username: 1 }).lean() as any,
      UserModel.findById(toUserId, { expoPushToken: 1 }).lean() as any,
    ])

    if (!target?.expoPushToken) return c.json({ ok: true })

    const username = STRIP_TAGS(sender?.username ?? 'Someone')
    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({
        to: target.expoPushToken,
        title: 'Challenge!',
        body: `${username} wants to play Word Duel`,
        sound: 'default',
        data: { roomId },
      }),
    })

    return c.json({ ok: true })
  } catch (err) {
    if (err instanceof ZodError)
      return c.json({ error: err.errors[0].message }, 400)
    console.error('[notifications/challenge POST]', err)
    return c.json({ error: 'Failed to send challenge notification' }, 500)
  }
})

export default notifications
