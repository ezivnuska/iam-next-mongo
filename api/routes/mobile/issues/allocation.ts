// api/routes/mobile/issues/allocation.ts
// PUT /api/mobile/issues/:id/allocation — set (or clear) a user's credit allocation

import { Hono } from 'hono'
import { authMiddleware, TokenPayload } from '../../../middleware/auth'
import { connectToDatabase } from '../../../../app/lib/mongoose'
import { isValidObjectId } from '../../../../app/lib/utils/validation'
import AllocationModel from '../../../../app/lib/models/allocation'
import MembershipModel from '../../../../app/lib/models/membership'
import Issue from '../../../../app/lib/models/issue'
import { emitPoolUpdated, emitIssueAllocationUpdated } from '../../../lib/socketEmit'

const allocationRoutes = new Hono<{ Variables: { token: TokenPayload } }>()

allocationRoutes.put('/api/mobile/issues/:id/allocation', authMiddleware, async (c) => {
  const token  = c.get('token')
  const issueId = c.req.param('id')
  if (!isValidObjectId(issueId)) return c.json({ error: 'Invalid issue ID' }, 400)

  const { amount } = await c.req.json() as { amount: number }
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount < 0)
    return c.json({ error: 'amount must be a non-negative number' }, 400)

  try {
    await connectToDatabase()

    const issue = await Issue.findById(issueId, { status: 1 }).lean() as any
    if (!issue) return c.json({ error: 'Issue not found' }, 404)
    if (issue.status !== 'open') return c.json({ error: 'Issue is not open for allocation' }, 409)

    const membership = await MembershipModel.findOne({ userId: token.id }).lean()
    if (!membership) return c.json({ error: 'You need an active membership to allocate credits' }, 403)

    // Get current allocation for this issue (may be 0)
    const existing = await AllocationModel.findOne({ userId: token.id, issueId }).lean() as any
    const previousAmount = existing?.amount ?? 0
    const delta = amount - previousAmount

    // Validate the user has enough credits for the increase
    const available = Math.max(0, membership.creditsTotal - membership.creditsAllocated)
    if (delta > available)
      return c.json({ error: `Insufficient credits. Available: ${available}` }, 400)

    // Upsert allocation
    if (amount === 0) {
      await AllocationModel.findOneAndDelete({ userId: token.id, issueId })
    } else {
      await AllocationModel.findOneAndUpdate(
        { userId: token.id, issueId },
        { amount },
        { upsert: true }
      )
    }

    // Update membership creditsAllocated
    await MembershipModel.findOneAndUpdate(
      { userId: token.id },
      [{ $set: { creditsAllocated: { $max: [0, { $add: ['$creditsAllocated', delta] }] } } }]
    )

    // Recompute issue totals for socket emit
    const [allAllocations, memberTotals, globalAllocTotals, openCount] = await Promise.all([
      AllocationModel.aggregate([{ $match: { issueId: issue._id } }, { $group: { _id: null, total: { $sum: '$amount' } } }]),
      MembershipModel.aggregate([{ $group: { _id: null, total: { $sum: '$creditsTotal' } } }]),
      AllocationModel.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
      Issue.countDocuments({ status: 'open' }),
    ])

    const totalAllocated   = allAllocations[0]?.total ?? 0
    const totalCredits     = memberTotals[0]?.total ?? 0
    const totalAllocGlobal = globalAllocTotals[0]?.total ?? 0
    const unallocated      = Math.max(0, totalCredits - totalAllocGlobal)
    const sharePerIssue    = openCount > 0 ? Math.floor(unallocated / openCount) : 0

    emitIssueAllocationUpdated({ issueId, totalAllocated, generalPoolShare: sharePerIssue })
      .catch((err: any) => console.warn('[socket]', err?.message ?? err))
    emitPoolUpdated({ sharePerIssue })
      .catch((err: any) => console.warn('[socket]', err?.message ?? err))

    return c.json({ allocation: amount, totalAllocated, generalPoolShare: sharePerIssue })
  } catch (err) {
    console.error('[allocation PUT]', err)
    return c.json({ error: 'Failed to set allocation' }, 500)
  }
})

export default allocationRoutes
