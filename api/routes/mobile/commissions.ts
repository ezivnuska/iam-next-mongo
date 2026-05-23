// api/routes/mobile/commissions.ts
// GET /api/mobile/commissions — completed issues where current user was accepted worker

import { Hono } from 'hono'
import mongoose from 'mongoose'
import { authMiddleware, TokenPayload } from '../../middleware/auth'
import { connectToDatabase } from '../../../app/lib/mongoose'
import { serializeIssue } from '../../../app/lib/mobile/serializers'
import { attachIssueData } from '../../../app/lib/mobile/attachIssueData'
import Applicant from '../../../app/lib/models/applicant'
import Issue from '../../../app/lib/models/issue'
import '../../../app/lib/models/image'
import '../../../app/lib/models/user'

const commissions = new Hono<{ Variables: { token: TokenPayload } }>()

commissions.get('/api/mobile/commissions', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    await connectToDatabase()

    const rawId = c.req.query('userId') ?? token.id
    if (!mongoose.Types.ObjectId.isValid(rawId))
      return c.json({ issues: [] })

    const userId = new mongoose.Types.ObjectId(rawId)

    const acceptedApplications = await Applicant.find({ userId, status: 'accepted' }).lean()
    const issueIds = acceptedApplications.map((a: any) => a.issueId)

    if (issueIds.length === 0) return c.json({ issues: [] })

    const issues = await Issue.find({ _id: { $in: issueIds }, status: 'completed' })
      .sort({ createdAt: -1 })
      .populate({ path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } })
      .lean()

    const issuesWithData = await attachIssueData(issues as any[])
    return c.json({ issues: issuesWithData.map(serializeIssue) })
  } catch (err) {
    console.error('[mobile/commissions GET]', err)
    return c.json({ error: 'Failed to fetch commissions' }, 500)
  }
})

export default commissions
