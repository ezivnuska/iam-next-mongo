// app/api/messages/[id]/route.ts
// DELETE /api/messages/:id — delete a message (sender only)

import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import MessageModel from '@/packages/db/models/message'
import { requireAuth, UnauthorizedError } from '@/app/lib/utils/auth'
import { isValidObjectId } from '@iam/shared-types'

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await requireAuth()
    const { id } = await params

    if (!isValidObjectId(id))
      return NextResponse.json({ error: 'Invalid message ID' }, { status: 400 })

    await connectToDatabase()

    const doc = await MessageModel.findById(id)
    if (!doc) return NextResponse.json({ error: 'Message not found' }, { status: 404 })

    if (doc.from.toString() !== userId)
      return NextResponse.json({ error: 'Only the sender can delete a message' }, { status: 403 })

    const toId     = doc.to.toString()
    const threadId = doc.threadId

    await MessageModel.deleteOne({ _id: id })

    try {
      const io = global.io
      if (io) io.to(`user:${toId}`).emit('message:deleted', { messageId: id, threadId, toId })
    } catch (err) {
      console.error('[DELETE /api/messages/:id] socket emit failed:', err)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof UnauthorizedError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('[DELETE /api/messages/:id]', err)
    return NextResponse.json({ error: 'Failed to delete message' }, { status: 500 })
  }
}
