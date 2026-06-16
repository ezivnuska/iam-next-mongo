// app/api/mobile/commissions/route.ts
// GET — list completed issues where the specified user (default: current user) was the accepted worker

import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
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

    const rawId = req.nextUrl.searchParams.get('userId') ?? token.id
    if (!mongoose.Types.ObjectId.isValid(rawId)) {
      return NextResponse.json({ issues: [] })
    }
    const userId = new mongoose.Types.ObjectId(rawId)

    const acceptedApplications = await Applicant.find({ userId, status: 'accepted' }).lean()
    const issueIds = acceptedApplications.map((a: any) => a.issueId)

    if (issueIds.length === 0) return NextResponse.json({ issues: [] })

    const issues = await Issue.find({ _id: { $in: issueIds }, status: 'completed' })
      .sort({ createdAt: -1 })
      .populate({ path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } })
      .lean()

    const issuesWithData = await attachIssueData(issues as any[])
    return NextResponse.json({ issues: issuesWithData.map(serializeIssue) })
  } catch (err) {
    console.error('[mobile/commissions GET]', err)
    return NextResponse.json({ error: 'Failed to fetch commissions' }, { status: 500 })
  }
})
