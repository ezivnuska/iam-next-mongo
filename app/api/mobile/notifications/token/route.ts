// app/api/mobile/notifications/token/route.ts
// POST — register or update the caller's Expo push token

import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import UserModel from '@/app/lib/models/user'

export const POST = withAuth(async (req, token) => {
  try {
    const { token: pushToken } = await req.json()
    if (typeof pushToken !== 'string' || !pushToken.startsWith('ExponentPushToken'))
      return NextResponse.json({ error: 'Invalid push token' }, { status: 400 })

    await connectToDatabase()
    await UserModel.findByIdAndUpdate(token.id, { expoPushToken: pushToken })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[notifications/token POST]', err)
    return NextResponse.json({ error: 'Failed to register token' }, { status: 500 })
  }
})
