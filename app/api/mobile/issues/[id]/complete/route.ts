// app/api/mobile/needs/[id]/complete/route.ts
// PATCH — admin/author fallback to manually trigger settlement if auto-settlement failed.

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { verifyToken } from '@/app/lib/mobile/verifyToken'
import { serializeIssue } from '@/app/lib/mobile/serializers'
import { settleIssue } from '@/app/lib/mobile/settleIssue'
import Issue from '@/app/lib/models/issue'
import Pledge from '@/app/lib/models/pledge'
import Applicant from '@/app/lib/models/applicant'
import '@/app/lib/models/image'
import '@/app/lib/models/user'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const tokenPayload = await verifyToken(req)
  if (!tokenPayload) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  if (!/^[a-f\d]{24}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })
  }

  try {
    await connectToDatabase()

    const need = await Issue.findById(id)
    if (!need) return NextResponse.json({ error: 'Issue not found' }, { status: 404 })

    const isAuthor = need.author.toString() === tokenPayload.id
    const isAdmin = tokenPayload.role === 'admin'
    if (!isAuthor && !isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    if (need.status !== 'completed') {
      await settleIssue(id)
    }

    await need.populate([
      { path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } },
      { path: 'image' },
    ])

    const [pledges, applicants] = await Promise.all([
      Pledge.find({ issueId: id }).populate({ path: 'userId', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } }).lean(),
      Applicant.find({ issueId: id }).lean(),
    ])

    return NextResponse.json({ issue: serializeIssue({ ...need.toObject(), pledged: pledges, applicants }) })
  } catch (err: any) {
    console.error('[mobile/issues/complete PATCH]', err)
    return NextResponse.json({ error: err?.message ?? 'Failed to complete need' }, { status: 500 })
  }
}
