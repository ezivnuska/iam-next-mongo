// app/api/mobile/issues/feed/route.ts
// GET — list all issues from all users

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import { serializeIssue } from '@/app/lib/mobile/serializers'
import { attachIssueData } from '@/app/lib/mobile/attachIssueData'
import Issue from '@/app/lib/models/issue'
import '@/app/lib/models/image'
import '@/app/lib/models/user'

export const GET = withAuth(async (req) => {
  try {
    await connectToDatabase()

    const status = req.nextUrl.searchParams.get('status') ?? 'open'
    const query = status === 'open'
      ? { $or: [{ status: 'open' }, { status: 'completed' }, { status: { $exists: false } }] }
      : { status }

    const limit = Math.min(parseInt(req.nextUrl.searchParams.get('limit') ?? '100'), 200)
    const issues = await Issue.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate({
        path: 'author',
        select: '_id username avatar',
        populate: { path: 'avatar', select: '_id variants' },
      })
      .populate('image')
      .lean()

    const issuesWithData = await attachIssueData(issues as any[])
    return NextResponse.json({ issues: issuesWithData.map(serializeIssue) })
  } catch (err) {
    console.error('[mobile/issues/feed GET]', err)
    return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 })
  }
})
