// app/api/mobile/issues/[id]/flag/route.ts
// POST  — flag an issue as inappropriate
// PATCH — admin reviews a flag (approve = remove issue, dismiss = clear flag)

import { isValidObjectId } from '@/app/lib/utils/validation'
import { NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import Issue from '@/app/lib/models/issue'

export const POST = withAuth(async (req, token, ctx) => {
  const { id } = await ctx.params
  if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })

  try {
    await connectToDatabase()
    const issue = await Issue.findByIdAndUpdate(id, { flagged: true }, { new: true }).lean()
    if (!issue) return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[mobile/issues/flag POST]', err)
    return NextResponse.json({ error: 'Failed to flag issue' }, { status: 500 })
  }
})

export const PATCH = withAuth(async (req, token, ctx) => {
  const { id } = await ctx.params
  if (!isValidObjectId(id)) return NextResponse.json({ error: 'Invalid issue ID' }, { status: 400 })

  const { action } = await req.json()
  if (action !== 'approve' && action !== 'dismiss')
    return NextResponse.json({ error: 'Action must be "approve" or "dismiss"' }, { status: 400 })

  try {
    await connectToDatabase()
    if (action === 'approve') {
      await Issue.findByIdAndDelete(id)
    } else {
      await Issue.findByIdAndUpdate(id, { flagged: false })
    }
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[mobile/issues/flag PATCH]', err)
    return NextResponse.json({ error: 'Failed to review flag' }, { status: 500 })
  }
})
