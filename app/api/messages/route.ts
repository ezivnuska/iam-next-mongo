// app/api/messages/route.ts
// POST /api/messages         — send a message
// GET  /api/messages         — list threads (conversations)

import { NextResponse } from 'next/server'
import { Types } from 'mongoose'
import { connectToDatabase } from '@/app/lib/mongoose'
import MessageModel from '@/packages/db/models/message'
import { normalizeMessage } from '@iam/db'
import { requireAuth, UnauthorizedError } from '@/app/lib/utils/auth'
import { isValidObjectId } from '@iam/shared-types'

const populateParticipants = [
  { path: 'from', select: 'username avatar', populate: { path: 'avatar', select: 'variants' } },
  { path: 'to',   select: 'username avatar', populate: { path: 'avatar', select: 'variants' } },
]

function deriveThreadId(a: string, b: string): string {
  return [a, b].sort().join(':')
}

export async function POST(req: Request) {
  try {
    const { id: userId } = await requireAuth()
    const body = await req.json()
    const { toId, text } = body

    if (!toId || !isValidObjectId(toId))
      return NextResponse.json({ error: 'Invalid recipient ID' }, { status: 400 })
    if (toId === userId)
      return NextResponse.json({ error: 'Cannot message yourself' }, { status: 400 })
    if (!text?.trim())
      return NextResponse.json({ error: 'Message cannot be empty' }, { status: 400 })
    if (text.length > 2000)
      return NextResponse.json({ error: 'Message too long' }, { status: 400 })

    await connectToDatabase()

    const threadId = deriveThreadId(userId, toId)
    const doc = await MessageModel.create({ threadId, from: userId, to: toId, text: text.trim() })
    await doc.populate(populateParticipants)
    const message = normalizeMessage(doc)

    try {
      const io = (global as any).io
      if (io) io.to(`user:${toId}`).emit('message:sent', { messageId: message.id, threadId, fromId: userId, toId })
    } catch (err) {
      console.error('[POST /api/messages] socket emit failed:', err)
    }

    return NextResponse.json({ message }, { status: 201 })
  } catch (err) {
    if (err instanceof UnauthorizedError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('[POST /api/messages]', err)
    return NextResponse.json({ error: 'Failed to send message' }, { status: 500 })
  }
}

export async function GET() {
  try {
    const { id: userId } = await requireAuth()

    await connectToDatabase()

    const uid = new Types.ObjectId(userId)

    const threadGroups = await MessageModel.aggregate([
      { $match: { $or: [{ from: uid }, { to: uid }] } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$threadId',
          lastMessageId: { $first: '$_id' },
          lastMessageAt: { $first: '$createdAt' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$to', uid] }, { $eq: ['$readAt', null] }] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { lastMessageAt: -1 } },
    ])

    const lastMessageIds = threadGroups.map((t) => t.lastMessageId)
    const lastMessages = await MessageModel.find({ _id: { $in: lastMessageIds } })
      .populate(populateParticipants as any)
      .lean()

    const msgMap = new Map((lastMessages as any[]).map((m) => [m._id.toString(), m]))

    const threads = threadGroups
      .map((t) => {
        const raw = msgMap.get(t.lastMessageId.toString())
        if (!raw) return null
        return {
          threadId: t._id as string,
          unreadCount: t.unreadCount as number,
          lastMessage: normalizeMessage(raw),
        }
      })
      .filter(Boolean)

    return NextResponse.json({ threads })
  } catch (err) {
    if (err instanceof UnauthorizedError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('[GET /api/messages]', err)
    return NextResponse.json({ error: 'Failed to load threads' }, { status: 500 })
  }
}
