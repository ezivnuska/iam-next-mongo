// app/api/mobile/issues/work/route.ts
// GET — list issues where the current user has applied

import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import { serializeIssue } from '@/app/lib/mobile/serializers'
import { attachIssueData } from '@/app/lib/mobile/attachIssueData'
import Issue from '@/app/lib/models/issue'
import Applicant from '@/app/lib/models/applicant'
import '@/app/lib/models/image'
import '@/app/lib/models/user'

export const GET = withAuth(async (req, token) => {
  try {
    await connectToDatabase()

    const userId = new mongoose.Types.ObjectId(token.id)
    const applicantRecords = await Applicant.find({ userId }).lean()
    const issueIds = applicantRecords.map((a) => a.issueId)

    if (issueIds.length === 0) return NextResponse.json({ issues: [] })

    const issues = await Issue.find({ _id: { $in: issueIds } })
      .sort({ createdAt: -1 })
      .populate({
        path: 'author',
        select: '_id username avatar',
        populate: { path: 'avatar', select: '_id variants' },
      })
      .populate('images')
      .populate('image')
      .lean()

    const issuesWithData = await attachIssueData(issues as any[])
    return NextResponse.json({ issues: issuesWithData.map(serializeIssue) })
  } catch (err) {
    console.error('[mobile/issues/work GET]', err)
    return NextResponse.json({ error: 'Failed to fetch work issues' }, { status: 500 })
  }
})
