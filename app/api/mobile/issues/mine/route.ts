// GET — issues where the current user is author, accepted worker, or contributor

import { NextResponse } from 'next/server'
import mongoose from 'mongoose'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import { serializeIssue } from '@/app/lib/mobile/serializers'
import { attachIssueData } from '@/app/lib/mobile/attachIssueData'
import Issue from '@/app/lib/models/issue'
import Applicant from '@/app/lib/models/applicant'
import Pledge from '@/app/lib/models/pledge'
import '@/app/lib/models/image'
import '@/app/lib/models/user'

export const GET = withAuth(async (req, token) => {
  try {
    await connectToDatabase()

    const userId = new mongoose.Types.ObjectId(token.id)

    const [applicantRecords, pledgeRecords] = await Promise.all([
      Applicant.find({ userId, status: 'accepted' }).lean(),
      Pledge.find({ userId }).lean(),
    ])

    const acceptedIssueIds = applicantRecords.map((a) => a.issueId)
    const pledgedIssueIds  = pledgeRecords.map((p) => p.issueId)

    const issues = await Issue.find({
      status: { $ne: 'completed' },
      $or: [
        { author: userId },
        { _id: { $in: acceptedIssueIds } },
        { _id: { $in: pledgedIssueIds } },
      ],
    })
      .sort({ createdAt: -1 })
      .populate({
        path: 'author',
        select: '_id username avatar',
        populate: { path: 'avatar', select: '_id variants' },
      })
      .populate('images')
      .lean()

    const issuesWithData = await attachIssueData(issues as any[])
    return NextResponse.json({ issues: issuesWithData.map(serializeIssue) })
  } catch (err) {
    console.error('[mobile/issues/mine GET]', err)
    return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 })
  }
})
