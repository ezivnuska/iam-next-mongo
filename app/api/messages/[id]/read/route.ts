// app/api/messages/[id]/read/route.ts
// PATCH /api/messages/:id/read — mark a message as read (recipient only)

import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import MessageModel from '@/packages/db/models/message'
import { requireAuth, UnauthorizedError } from '@/app/lib/utils/auth'
import { isValidObjectId } from '@iam/shared-types'

export async function PATCH(
  _req: Request,
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
    if ((doc as any).to.toString() !== userId)
      return NextResponse.json({ error: 'Only the recipient can mark a message as read' }, { status: 403 })
    if ((doc as any).readAt) return NextResponse.json({ ok: true })

    ;(doc as any).readAt = new Date()
    await (doc as any).save()

    return NextResponse.json({ ok: true })
  } catch (err) {
    if (err instanceof UnauthorizedError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    console.error('[PATCH /api/messages/:id/read]', err)
    return NextResponse.json({ error: 'Failed to mark message as read' }, { status: 500 })
  }
}
