// app/api/mobile/issues/counts/route.ts
// GET — lightweight active/completed issue counts for the home screen

import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import Issue from '@/app/lib/models/issue'

export const GET = withAuth(async () => {
  try {
    await connectToDatabase()

    const [active, completed] = await Promise.all([
      Issue.countDocuments({ status: { $ne: 'completed' } }),
      Issue.countDocuments({ status: 'completed' }),
    ])

    return NextResponse.json({ active, completed })
  } catch (err) {
    console.error('[mobile/issues/counts GET]', err)
    return NextResponse.json({ error: 'Failed to fetch counts' }, { status: 500 })
  }
})
