'use server'

import { Types } from 'mongoose'
import { connectToDatabase } from '@/app/lib/mongoose'
import MessageModel from '@/packages/db/models/message'
import UserModel from '@/app/lib/models/user'
import { normalizeMessage } from '@iam/db'
import { requireAuth } from '@/app/lib/utils/auth'
import { isValidObjectId } from '@iam/shared-types'
import { emitMessageSent, emitMessageDeleted } from '@/app/lib/socket/emit'
import type { Message, MessageThread } from '@/app/lib/definitions/message'

function deriveThreadId(a: string, b: string): string {
  return [a, b].sort().join(':')
}

const POPULATE_PARTICIPANTS = [
  { path: 'from', select: 'username avatar', populate: { path: 'avatar', select: 'variants' } },
  { path: 'to',   select: 'username avatar', populate: { path: 'avatar', select: 'variants' } },
]

export async function getThreads(): Promise<MessageThread[]> {
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

  if (threadGroups.length === 0) return []

  const lastMessageIds = threadGroups.map((t) => t.lastMessageId)
  const lastMessages = await MessageModel.find({ _id: { $in: lastMessageIds } })
    .populate(POPULATE_PARTICIPANTS)
    .lean()

  const msgMap = new Map(lastMessages.map((m) => [m._id.toString(), m]))

  return threadGroups
    .map((t) => {
      const raw = msgMap.get(t.lastMessageId.toString())
      if (!raw) return null
      return {
        threadId: t._id as string,
        unreadCount: t.unreadCount as number,
        lastMessage: normalizeMessage(raw),
      }
    })
    .filter((t): t is MessageThread => t !== null)
}

export async function getThreadMessages(
  threadId: string,
  { limit = 50, skip = 0 }: { limit?: number; skip?: number } = {}
): Promise<{ messages: Message[]; total: number }> {
  const { id: userId } = await requireAuth()

  const parts = threadId.split(':')
  if (parts.length !== 2 || !parts.every(isValidObjectId))
    throw new Error('Invalid thread ID')
  if (!parts.includes(userId))
    throw new Error('Not a participant in this thread')

  await connectToDatabase()

  const [docs, total] = await Promise.all([
    MessageModel.find({ threadId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Math.min(limit, 100))
      .populate(POPULATE_PARTICIPANTS)
      .lean(),
    MessageModel.countDocuments({ threadId }),
  ])

  return { messages: docs.map(normalizeMessage), total }
}

export async function sendMessage(toId: string, text: string): Promise<Message> {
  const { id: userId } = await requireAuth()

  if (!isValidObjectId(toId)) throw new Error('Invalid recipient ID')
  if (toId === userId) throw new Error('Cannot message yourself')
  const trimmed = text.trim()
  if (!trimmed) throw new Error('Message cannot be empty')
  if (trimmed.length > 2000) throw new Error('Message too long')

  await connectToDatabase()

  const recipient = await UserModel.findById(toId).select('_id').lean()
  if (!recipient) throw new Error('Recipient not found')

  const threadId = deriveThreadId(userId, toId)
  const doc = await MessageModel.create({ threadId, from: userId, to: toId, text: trimmed })
  await doc.populate(POPULATE_PARTICIPANTS)
  const message = normalizeMessage(doc)

  emitMessageSent({ messageId: message.id, threadId, fromId: userId, toId }).catch(
    (err) => console.error('[sendMessage] socket emit failed:', err)
  )

  return message
}

export async function markMessageRead(messageId: string): Promise<void> {
  const { id: userId } = await requireAuth()

  if (!isValidObjectId(messageId)) throw new Error('Invalid message ID')

  await connectToDatabase()

  const doc = await MessageModel.findById(messageId)
  if (!doc || doc.readAt) return

  if (doc.to.toString() !== userId)
    throw new Error('Only the recipient can mark a message as read')

  doc.readAt = new Date()
  await doc.save()
}

export async function getUnreadCount(): Promise<number> {
  const { id: userId } = await requireAuth()
  await connectToDatabase()
  const uid = new Types.ObjectId(userId)
  return MessageModel.countDocuments({ to: uid, readAt: null })
}

export async function deleteMessage(messageId: string): Promise<void> {
  const { id: userId } = await requireAuth()

  if (!isValidObjectId(messageId)) throw new Error('Invalid message ID')

  await connectToDatabase()

  const doc = await MessageModel.findById(messageId)
  if (!doc) throw new Error('Message not found')
  if (doc.from.toString() !== userId)
    throw new Error('Only the sender can delete a message')

  const toId     = doc.to.toString()
  const threadId = doc.threadId

  await MessageModel.deleteOne({ _id: messageId })

  emitMessageDeleted({ messageId, threadId, toId }).catch(
    (err) => console.error('[deleteMessage] socket emit failed:', err)
  )
}
