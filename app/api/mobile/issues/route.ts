// app/api/mobile/issues/route.ts
// GET  — list current user's issues
// POST — create a new issue

import { isValidObjectId, USER_WITH_AVATAR_POPULATE } from '@/app/lib/utils/validation'
import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import { serializeIssue } from '@/app/lib/mobile/serializers'
import { attachIssueData } from '@/app/lib/mobile/attachIssueData'
import { createPledgeWithPaymentIntent } from '@/app/lib/mobile/createPledge'
import Issue from '@/app/lib/models/issue'
import '@/app/lib/models/image'

export const GET = withAuth(async (req, token) => {
  try {
    await connectToDatabase()

    const issues = await Issue.find({ author: token.id })
      .sort({ createdAt: -1 })
      .populate({ path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } })
      .populate('image')
      .lean()

    const issuesWithData = await attachIssueData(issues as any[])
    return NextResponse.json({ issues: issuesWithData.map(serializeIssue) })
  } catch (err) {
    console.error('[mobile/issues GET]', err)
    return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 })
  }
})

export const POST = withAuth(async (req, token) => {
  try {
    const { issueType, content, imageId, location, locationVisible, initialPledge } = await req.json()

    const validIssueTypes = ['Clean Up', 'Gardening', 'Hauling']
    if (!issueType || !validIssueTypes.includes(issueType)) {
      return NextResponse.json({ error: 'Invalid issue type' }, { status: 400 })
    }

    if (content && content.length > 5000) {
      return NextResponse.json({ error: 'Content must be 5000 characters or less' }, { status: 400 })
    }

    if (imageId && !isValidObjectId(imageId)) {
      return NextResponse.json({ error: 'Invalid image ID' }, { status: 400 })
    }

    const validLocation =
      location &&
      typeof location.latitude === 'number' &&
      typeof location.longitude === 'number'
        ? { latitude: location.latitude, longitude: location.longitude }
        : undefined

    await connectToDatabase()

    const issue = await Issue.create({
      author: token.id,
      issueType,
      ...(content?.trim() ? { content: content.trim() } : {}),
      ...(validLocation ? { location: validLocation } : {}),
      locationVisible: locationVisible === true,
      ...(imageId ? { image: imageId } : {}),
    })

    await issue.populate('image')

    let pledged: any[] = []
    if (initialPledge && typeof initialPledge === 'number' && initialPledge > 0) {
      const pledge = await createPledgeWithPaymentIntent(token.id, issue._id.toString(), initialPledge)
      await pledge.populate(USER_WITH_AVATAR_POPULATE)
      pledged = [pledge.toObject()]
    }

    return NextResponse.json({ issue: serializeIssue({ ...issue.toObject(), pledged, applicants: [] }) }, { status: 201 })
  } catch (err: any) {
    if (err.code === 'NO_PAYMENT_METHOD') {
      return NextResponse.json({ error: err.message, code: 'NO_PAYMENT_METHOD' }, { status: 402 })
    }
    console.error('[mobile/issues POST]', err)
    return NextResponse.json({ error: 'Failed to create issue' }, { status: 500 })
  }
})
