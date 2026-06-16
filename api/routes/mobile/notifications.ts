// api/routes/mobile/notifications.ts
// POST   /api/mobile/notifications/token  — register Expo push token
// DELETE /api/mobile/notifications/token  — clear push token on logout
// POST   /api/mobile/notifications/notify — send push notification to a user

import { Hono } from 'hono'
import { authMiddleware, TokenPayload } from '../../middleware/auth'
import { connectToDatabase } from '../../../app/lib/mongoose'
import { isValidObjectId } from '../../../app/lib/utils/validation'
import UserModel from '../../../app/lib/models/user'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

const notifications = new Hono<{ Variables: { token: TokenPayload } }>()

notifications.post('/api/mobile/notifications/token', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    const { token: pushToken } = await c.req.json()
    if (typeof pushToken !== 'string' || !pushToken.startsWith('ExponentPushToken'))
      return c.json({ error: 'Invalid push token' }, 400)

    await connectToDatabase()
    await UserModel.findByIdAndUpdate(token.id, { expoPushToken: pushToken })
    return c.json({ ok: true })
  } catch (err) {
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

notifications.post('/api/mobile/notifications/notify', authMiddleware, async (c) => {
  try {
    const { userId, title, body } = await c.req.json()
    if (!userId || !title || !body)
      return c.json({ error: 'userId, title, and body are required' }, 400)
    if (!isValidObjectId(userId))
      return c.json({ error: 'Invalid userId' }, 400)
    if (typeof title !== 'string' || title.length > 100)
      return c.json({ error: 'title must be a string under 100 characters' }, 400)
    if (typeof body !== 'string' || body.length > 500)
      return c.json({ error: 'body must be a string under 500 characters' }, 400)

    await connectToDatabase()
    const user = await UserModel.findById(userId, { expoPushToken: 1 }).lean() as any
    if (!user?.expoPushToken) return c.json({ ok: true })

    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ to: user.expoPushToken, title, body, sound: 'default' }),
    })

    return c.json({ ok: true })
  } catch (err) {
    console.error('[notifications/notify POST]', err)
    return c.json({ error: 'Failed to send notification' }, 500)
  }
})

export default notifications
