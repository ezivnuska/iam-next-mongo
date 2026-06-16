// app/api/mobile/notifications/token/route.ts
// POST   — register or update the caller's Expo push token
// DELETE — clear the caller's Expo push token (call on logout)

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

export const DELETE = withAuth(async (_req, token) => {
  try {
    await connectToDatabase()
    await UserModel.findByIdAndUpdate(token.id, { $unset: { expoPushToken: '' } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[notifications/token DELETE]', err)
    return NextResponse.json({ error: 'Failed to clear token' }, { status: 500 })
  }
})
