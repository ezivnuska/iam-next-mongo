// app/api/mobile/admin/fees/route.ts
// GET — return all collected platform fees with issue and user details. Admin only.

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import Fee from '@/app/lib/models/fee'
import '@/app/lib/models/issue'
import '@/app/lib/models/user'
import '@/app/lib/models/image'

export const GET = withAuth(async (req, token) => {
  if (token.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  try {
    await connectToDatabase()

    const rawFees = await Fee.find({})
      .sort({ createdAt: -1 })
      .populate({ path: 'userId', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } })
      .populate({ path: 'issueId', select: '_id issueType status' })
      .lean() as any[]

    const fees = rawFees.map((f) => {
      const issue = f.issueId as any
      const user  = f.userId  as any
      const issueStatus: string | null = issue?.status ?? null
      const feeStatus = issueStatus === 'open' ? 'pending' : 'captured'

      return {
        id:           f._id.toString(),
        amount:       f.amount,
        createdAt:    f.createdAt,
        issueId:      issue?._id?.toString() ?? null,
        issueType:    issue?.issueType ?? null,
        issueStatus,
        feeStatus,
        userId:       user?._id?.toString() ?? null,
        username:     user?.username ?? null,
        avatar:       user?.avatar
          ? { id: (user.avatar as any)._id.toString(), variants: (user.avatar as any).variants ?? [] }
          : null,
      }
    })

    const captured = fees.filter((f) => f.feeStatus === 'captured').length
    const pending  = fees.filter((f) => f.feeStatus === 'pending').length
    const totalAmount = fees.reduce((sum, f) => sum + f.amount, 0)

    return NextResponse.json({
      summary: { count: fees.length, totalAmount, captured, pending },
      fees,
    })
  } catch (err) {
    console.error('[admin/fees GET]', err)
    return NextResponse.json({ error: 'Failed to load fees' }, { status: 500 })
  }
})
