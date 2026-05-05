// app/api/mobile/commissions/route.ts
// GET — list completed issues where the current user was the accepted worker

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import { serializeIssue } from '@/app/lib/mobile/serializers'
import { attachIssueData } from '@/app/lib/mobile/attachIssueData'
import Applicant from '@/app/lib/models/applicant'
import Issue from '@/app/lib/models/issue'
import '@/app/lib/models/image'
import '@/app/lib/models/user'

export const GET = withAuth(async (req, token) => {
  try {
    await connectToDatabase()

    const acceptedApplications = await Applicant.find({ userId: token.id, status: 'accepted' }).lean()
    const issueIds = acceptedApplications.map((a: any) => a.issueId)

    if (issueIds.length === 0) return NextResponse.json({ issues: [] })

    const issues = await Issue.find({ _id: { $in: issueIds }, status: 'completed' })
      .sort({ createdAt: -1 })
      .populate({ path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } })
      .populate('image')
      .lean()

    const issuesWithData = await attachIssueData(issues as any[])
    return NextResponse.json({ issues: issuesWithData.map(serializeIssue) })
  } catch (err) {
    console.error('[mobile/commissions GET]', err)
    return NextResponse.json({ error: 'Failed to fetch commissions' }, { status: 500 })
  }
})
