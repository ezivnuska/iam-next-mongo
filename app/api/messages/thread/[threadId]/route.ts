// app/api/messages/thread/[threadId]/route.ts
// GET /api/messages/thread/:threadId — paginated messages in a thread

import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import MessageModel from '@/packages/db/models/message'
import { normalizeMessage } from '@iam/db'
import { requireAuth, UnauthorizedError } from '@/app/lib/utils/auth'
import { isValidObjectId } from '@iam/shared-types'

const populateParticipants = [
  { path: 'from', select: 'username avatar', populate: { path: 'avatar', select: 'variants' } },
  { path: 'to',   select: 'username avatar', populate: { path: 'avatar', select: 'variants' } },
]

export async function GET(
  req: Request,
  { params }: { params: Promise<{ threadId: string }> }
) {
  try {
    const { id: userId } = await requireAuth()
    const { threadId } = await params

    const parts = threadId.split(':')
    if (parts.length !== 2 || !parts.every(isValidObjectId))
      return NextResponse.json({ error: 'Invalid thread ID' }, { status: 400 })
    if (!parts.includes(userId))
      return NextResponse.json({ error: 'Not a participant in this thread' }, { status: 403 })

    const url = new URL(req.url)
    const limit = Math.min(Number(url.searchParams.get('limit') ?? 50), 100)
    const skip  = Math.max(Number(url.searchParams.get('skip')  ?? 0),  0)

    await connectToDatabase()

    const [docs, total] = await Promise.all([
      MessageModel.find({ threadId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(populateParticipants as any)
        .lean(),
      MessageModel.countDocuments({ threadId }),
    ])

    return NextResponse.json({ messages: (docs as any[]).map(normalizeMessage), total })
  } catch (err) {
    if (err instanceof UnauthorizedError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('[GET /api/messages/thread/:threadId]', err)
    return NextResponse.json({ error: 'Failed to load thread' }, { status: 500 })
  }
}
