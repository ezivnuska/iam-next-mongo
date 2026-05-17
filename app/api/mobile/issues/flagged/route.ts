// app/api/mobile/issues/flagged/route.ts
// GET — admin: list all flagged issues

import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import { serializeIssue } from '@/app/lib/mobile/serializers'
import { attachIssueData } from '@/app/lib/mobile/attachIssueData'
import Issue from '@/app/lib/models/issue'
import '@/app/lib/models/image'
import '@/app/lib/models/user'

export const GET = withAuth(async (req, token) => {
  try {
    await connectToDatabase()
    const issues = await Issue.find({ flagged: true })
      .sort({ createdAt: -1 })
      .populate({ path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } })
      .populate('image')
      .lean()
    const issuesWithData = await attachIssueData(issues as any[])
    return NextResponse.json({ issues: issuesWithData.map(serializeIssue) })
  } catch (err) {
    console.error('[mobile/issues/flagged GET]', err)
    return NextResponse.json({ error: 'Failed to fetch flagged issues' }, { status: 500 })
  }
})
