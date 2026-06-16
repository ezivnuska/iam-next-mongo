// app/api/mobile/ratings/route.ts
// GET — return the current user's received ratings as a worker

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import Rating from '@/app/lib/models/rating'
import '@/app/lib/models/issue'

export const GET = withAuth(async (req, token) => {
  try {
    await connectToDatabase()

    const raw = await Rating.find({ workerId: token.id })
      .sort({ createdAt: -1 })
      .populate({ path: 'issueId', select: 'issueType' })
      .lean() as any[]

    const count = raw.length
    const average = count === 0
      ? null
      : Math.round((raw.reduce((s, r) => s + r.score, 0) / count) * 10) / 10

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    for (const r of raw) distribution[r.score] = (distribution[r.score] ?? 0) + 1

    const ratings = raw.map((r) => ({
      id: r._id.toString(),
      score: r.score,
      issueType: r.issueId?.issueType ?? null,
      createdAt: r.createdAt?.toISOString() ?? null,
    }))

    return NextResponse.json({ average, count, distribution, ratings })
  } catch (err) {
    console.error('[mobile/ratings GET]', err)
    return NextResponse.json({ error: 'Failed to fetch ratings' }, { status: 500 })
  }
})
