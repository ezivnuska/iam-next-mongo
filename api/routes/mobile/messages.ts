// api/routes/mobile/messages.ts
// POST   /api/mobile/messages                    — send a message
// GET    /api/mobile/messages                    — list threads (conversations)
// GET    /api/mobile/messages/thread/:threadId   — messages in a thread
// PATCH  /api/mobile/messages/:id/read           — mark a message as read
// DELETE /api/mobile/messages/:id                — delete a message

import { Hono } from 'hono'
import { ZodError } from 'zod'
import { Types } from 'mongoose'
import { authMiddleware, TokenPayload } from '../../middleware/auth'
import { connectToDatabase } from '@/app/lib/mongoose'
import MessageModel from '@/packages/db/models/message'
import { normalizeMessage } from '@/packages/db/normalizers'
import { emitMessageSent, emitMessageDeleted } from '../../lib/socketEmit'
import { sendMessageRequestSchema } from '../../lib/schemas/message'
import { isValidObjectId } from '@iam/shared-types'

const messages = new Hono<{ Variables: { token: TokenPayload } }>()

function deriveThreadId(a: string, b: string): string {
  return [a, b].sort().join(':')
}

const populateParticipants = [
  { path: 'from', select: 'username avatar', populate: { path: 'avatar', select: 'variants' } },
  { path: 'to',   select: 'username avatar', populate: { path: 'avatar', select: 'variants' } },
]

// ── Send a message ────────────────────────────────────────────────────────────

messages.post('/api/mobile/messages', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    const { toId, text } = sendMessageRequestSchema.parse(await c.req.json())

    if (toId === token.id)
      return c.json({ error: 'Cannot message yourself' }, 400)

    await connectToDatabase()

    const threadId = deriveThreadId(token.id, toId)
    const doc = await MessageModel.create({ threadId, from: token.id, to: toId, text })
    const populated = await doc.populate(populateParticipants)
    const message = normalizeMessage(populated)

    try {
      await emitMessageSent({ messageId: message.id, threadId, fromId: token.id, toId })
    } catch (err) {
      console.error('[mobile/messages POST] socket emit failed:', err)
    }

    return c.json({ message }, 201)
  } catch (err) {
    if (err instanceof ZodError)
      return c.json({ error: err.errors[0].message }, 400)
    console.error('[mobile/messages POST]', err)
    return c.json({ error: 'Failed to send message' }, 500)
  }
})

// ── List threads ──────────────────────────────────────────────────────────────

messages.get('/api/mobile/messages', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    await connectToDatabase()

    const userId = new Types.ObjectId(token.id)

    // Group by thread, keeping the most recent message and unread count per thread.
    const threadGroups = await MessageModel.aggregate([
      { $match: { $or: [{ from: userId }, { to: userId }] } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$threadId',
          lastMessageId: { $first: '$_id' },
          lastMessageAt: { $first: '$createdAt' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$to', userId] }, { $eq: ['$readAt', null] }] },
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

    const msgMap = new Map(lastMessages.map((m: any) => [m._id.toString(), m]))

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

    return c.json({ threads })
  } catch (err) {
    console.error('[mobile/messages GET]', err)
    return c.json({ error: 'Failed to load threads' }, 500)
  }
})

// ── Messages in a thread ──────────────────────────────────────────────────────

messages.get('/api/mobile/messages/thread/:threadId', authMiddleware, async (c) => {
  const token = c.get('token')
  const threadId = c.req.param('threadId')

  // threadId is two sorted ObjectId strings joined by ':' — validate both parts.
  const parts = threadId.split(':')
  if (parts.length !== 2 || !parts.every(isValidObjectId))
    return c.json({ error: 'Invalid thread ID' }, 400)

  if (!parts.includes(token.id))
    return c.json({ error: 'Not a participant in this thread' }, 403)

  const limit = Math.min(Number(c.req.query('limit') ?? 50), 100)
  const skip  = Math.max(Number(c.req.query('skip')  ?? 0),   0)

  try {
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

    return c.json({ messages: (docs as any[]).map(normalizeMessage), total })
  } catch (err) {
    console.error('[mobile/messages/thread GET]', err)
    return c.json({ error: 'Failed to load thread' }, 500)
  }
})

// ── Mark as read ──────────────────────────────────────────────────────────────

messages.patch('/api/mobile/messages/:id/read', authMiddleware, async (c) => {
  const token = c.get('token')
  const id = c.req.param('id')
  if (!isValidObjectId(id)) return c.json({ error: 'Invalid message ID' }, 400)

  try {
    await connectToDatabase()

    const doc = await MessageModel.findById(id)
    if (!doc) return c.json({ error: 'Message not found' }, 404)
    if ((doc as any).to.toString() !== token.id)
      return c.json({ error: 'Only the recipient can mark a message as read' }, 403)
    if ((doc as any).readAt) return c.json({ ok: true })

    ;(doc as any).readAt = new Date()
    await (doc as any).save()

    return c.json({ ok: true })
  } catch (err) {
    console.error('[mobile/messages/:id/read PATCH]', err)
    return c.json({ error: 'Failed to mark message as read' }, 500)
  }
})

// ── Delete a message ──────────────────────────────────────────────────────────

messages.delete('/api/mobile/messages/:id', authMiddleware, async (c) => {
  const token = c.get('token')
  const id = c.req.param('id')
  if (!isValidObjectId(id)) return c.json({ error: 'Invalid message ID' }, 400)

  try {
    await connectToDatabase()

    const doc = await MessageModel.findById(id)
    if (!doc) return c.json({ error: 'Message not found' }, 404)

    const fromId = (doc as any).from.toString()
    const toId   = (doc as any).to.toString()

    if (fromId !== token.id)
      return c.json({ error: 'Only the sender can delete a message' }, 403)

    await MessageModel.deleteOne({ _id: id })

    try {
      await emitMessageDeleted({ messageId: id, threadId: (doc as any).threadId, toId })
    } catch (err) {
      console.error('[mobile/messages DELETE] socket emit failed:', err)
    }

    return c.json({ ok: true })
  } catch (err) {
    console.error('[mobile/messages DELETE]', err)
    return c.json({ error: 'Failed to delete message' }, 500)
  }
})

export default messages
