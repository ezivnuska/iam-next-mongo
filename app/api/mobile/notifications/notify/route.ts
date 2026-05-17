// app/api/mobile/notifications/notify/route.ts
// POST — send a push notification to a specific user by ID

import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import UserModel from '@/app/lib/models/user'

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send'

export const POST = withAuth(async (req) => {
  try {
    const { userId, title, body } = await req.json()
    if (!userId || !title || !body)
      return NextResponse.json({ error: 'userId, title, and body are required' }, { status: 400 })

    await connectToDatabase()
    const user = await UserModel.findById(userId, { expoPushToken: 1 }).lean() as any
    if (!user?.expoPushToken) return NextResponse.json({ ok: true })

    await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify({ to: user.expoPushToken, title, body, sound: 'default' }),
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[notifications/notify POST]', err)
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 })
  }
})
