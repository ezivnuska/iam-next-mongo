// api/routes/mobile/issues/index.ts
// GET  /api/mobile/issues       — list current user's issues
// POST /api/mobile/issues       — create a new issue

import { Hono } from 'hono'
import { authMiddleware, TokenPayload } from '../../../middleware/auth'
import { connectToDatabase } from '../../../../app/lib/mongoose'
import { serializeIssue } from '../../../../app/lib/mobile/serializers'
import { attachIssueData } from '../../../../app/lib/mobile/attachIssueData'
import { createIssueFee } from '../../../../app/lib/mobile/createFee'
import { generateIssueTitle } from '../../../../app/lib/mobile/generateTitle'
import { isValidObjectId } from '../../../../app/lib/utils/validation'
import { emitIssueCreated } from '../../../lib/socketEmit'
import Issue from '../../../../app/lib/models/issue'
import '../../../../app/lib/models/image'
import '../../../../app/lib/models/user'

const issues = new Hono<{ Variables: { token: TokenPayload } }>()

issues.get('/api/mobile/issues', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    await connectToDatabase()

    const issueList = await Issue.find({ author: token.id })
      .sort({ createdAt: -1 })
      .populate({ path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } })
      .populate('images')
      .lean()

    const issuesWithData = await attachIssueData(issueList as any[])
    return c.json({ issues: issuesWithData.map(serializeIssue) })
  } catch (err) {
    console.error('[mobile/issues GET]', err)
    return c.json({ error: 'Failed to fetch issues' }, 500)
  }
})

issues.post('/api/mobile/issues', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    const { issueType, title: userTitle, content, imageId, location, locationVisible } = await c.req.json()

    const validIssueTypes = ['Clean Up', 'Gardening', 'Hauling']
    if (!issueType || !validIssueTypes.includes(issueType))
      return c.json({ error: 'Invalid issue type' }, 400)

    if (userTitle && userTitle.length > 120)
      return c.json({ error: 'Title must be 120 characters or less' }, 400)

    if (content && content.length > 5000)
      return c.json({ error: 'Content must be 5000 characters or less' }, 400)

    if (imageId && !isValidObjectId(imageId))
      return c.json({ error: 'Invalid image ID' }, 400)

    const validLocation =
      location &&
      typeof location.latitude === 'number' &&
      typeof location.longitude === 'number'
        ? { latitude: location.latitude, longitude: location.longitude }
        : undefined

    const trimmedTitle = userTitle?.trim() || null
    const [, generatedTitle] = await Promise.all([
      connectToDatabase(),
      !trimmedTitle && validLocation
        ? generateIssueTitle(validLocation.latitude, validLocation.longitude)
        : null,
    ])

    const title = trimmedTitle ?? generatedTitle

    const issue = await Issue.create({
      author: token.id,
      issueType,
      ...(title ? { title } : {}),
      ...(content?.trim() ? { content: content.trim() } : {}),
      ...(validLocation ? { location: validLocation } : {}),
      locationVisible: locationVisible === true,
      images: imageId ? [imageId] : [],
    })

    await issue.populate([
      { path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } },
      { path: 'images' },
    ])

    try {
      await createIssueFee(token.id, issue._id.toString(), 1)
    } catch (err: any) {
      await Issue.findByIdAndDelete(issue._id)
      if (err.code === 'NO_PAYMENT_METHOD')
        return c.json({ error: err.message, code: 'NO_PAYMENT_METHOD' }, 402)
      throw err
    }

    const serialized = serializeIssue({ ...issue.toObject(), pledged: [], applicants: [] })
    emitIssueCreated({ actorId: token.id, issue: serialized })
      .catch((err: any) => console.warn('[socket]', err?.message ?? err))

    return c.json({ issue: serialized }, 201)
  } catch (err: any) {
    if (err.code === 'NO_PAYMENT_METHOD')
      return c.json({ error: err.message, code: 'NO_PAYMENT_METHOD' }, 402)
    console.error('[mobile/issues POST]', err)
    return c.json({ error: 'Failed to create issue' }, 500)
  }
})

export default issues
