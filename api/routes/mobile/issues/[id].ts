// api/routes/mobile/issues/[id].ts
// GET    /api/mobile/issues/:id  — fetch single issue
// PATCH  /api/mobile/issues/:id  — update issue (author only)
// DELETE /api/mobile/issues/:id  — delete issue + refund pledges + clean S3

import { Hono } from 'hono'
import { authMiddleware, TokenPayload } from '../../../middleware/auth'
import { connectToDatabase } from '../../../../app/lib/mongoose'
import { serializeIssue, serializeCompletion } from '../../../../app/lib/mobile/serializers'
import { isValidObjectId, USER_WITH_AVATAR_POPULATE, APPLICANT_USER_POPULATE } from '../../../../app/lib/utils/validation'
import Issue from '../../../../app/lib/models/issue'
import Pledge from '../../../../app/lib/models/pledge'
import Applicant from '../../../../app/lib/models/applicant'
import { deleteIssueWithCleanup } from '../../../../app/lib/mobile/deleteIssue'
import '../../../../app/lib/models/user'

const issueById = new Hono<{ Variables: { token: TokenPayload } }>()

issueById.get('/api/mobile/issues/:id', authMiddleware, async (c) => {
  const token = c.get('token')
  const id = c.req.param('id')
  if (!isValidObjectId(id)) return c.json({ error: 'Invalid issue ID' }, 400)

  try {
    await connectToDatabase()
    const need = await Issue.findById(id)
      .populate({ path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } })
      .populate('images')
      .populate('completion.images')
      .populate({ path: 'reports.userId', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } })
      .populate({ path: 'reports.imageId', select: '_id variants' })
      .lean()
    if (!need) return c.json({ error: 'Issue not found' }, 404)

    const [pledges, applicants] = await Promise.all([
      Pledge.find({ issueId: id }).populate(USER_WITH_AVATAR_POPULATE).lean(),
      Applicant.find({ issueId: id }).populate(APPLICANT_USER_POPULATE).lean(),
    ])
    const rawCompletion = (need as any).completion ?? null
    const completionStatus = rawCompletion?.status ?? null
    const completion = rawCompletion ? serializeCompletion(rawCompletion, id) : null
    return c.json({ issue: serializeIssue({ ...need, pledged: pledges, applicants, completionStatus }), completion })
  } catch (err) {
    console.error('[mobile/issues GET by id]', err)
    return c.json({ error: 'Failed to fetch issue' }, 500)
  }
})

issueById.patch('/api/mobile/issues/:id', authMiddleware, async (c) => {
  const token = c.get('token')
  const id = c.req.param('id')
  if (!isValidObjectId(id)) return c.json({ error: 'Invalid issue ID' }, 400)

  try {
    const { issueType, title, content, imageId, imageIds, location, locationVisible } = await c.req.json()

    const validIssueTypes = ['Clean Up', 'Gardening', 'Hauling']
    if (issueType !== undefined && !validIssueTypes.includes(issueType))
      return c.json({ error: 'Invalid issue type' }, 400)
    if (content !== undefined && content.length > 5000)
      return c.json({ error: 'Content must be 5000 characters or less' }, 400)
    if (imageId !== undefined && imageId !== null && !isValidObjectId(imageId))
      return c.json({ error: 'Invalid image ID' }, 400)
    if (Array.isArray(imageIds) && imageIds.some((id: any) => !isValidObjectId(id)))
      return c.json({ error: 'Invalid image ID in imageIds' }, 400)

    await connectToDatabase()
    const need = await Issue.findById(id)
    if (!need) return c.json({ error: 'Issue not found' }, 404)
    if (need.author.toString() !== token.id) return c.json({ error: 'Forbidden' }, 403)

    if (issueType !== undefined) need.issueType = issueType
    if (title !== undefined) need.title = title ? title.trim() : undefined
    if (content !== undefined) need.content = content.trim()
    if (Array.isArray(imageIds)) (need as any).images = imageIds
    else if (imageId === null) (need as any).images = []
    else if (typeof imageId === 'string') (need as any).images = [imageId]
    if (location !== undefined) {
      need.location = location !== null && typeof location.latitude === 'number' && typeof location.longitude === 'number'
        ? { latitude: location.latitude, longitude: location.longitude }
        : undefined
      need.markModified('location')
    }
    if (typeof locationVisible === 'boolean') need.locationVisible = locationVisible

    await need.save()
    await need.populate([
      { path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } },
      { path: 'images' },
      { path: 'reports.userId', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } },
      { path: 'reports.imageId', select: '_id variants' },
    ])
    const [pledges, applicants] = await Promise.all([
      Pledge.find({ issueId: id }).populate(USER_WITH_AVATAR_POPULATE).lean(),
      Applicant.find({ issueId: id }).populate(APPLICANT_USER_POPULATE).lean(),
    ])
    return c.json({ issue: serializeIssue({ ...need.toObject(), pledged: pledges, applicants }) })
  } catch (err) {
    console.error('[mobile/issues PATCH]', err)
    return c.json({ error: 'Failed to update issue' }, 500)
  }
})

issueById.delete('/api/mobile/issues/:id', authMiddleware, async (c) => {
  const token = c.get('token')
  const id = c.req.param('id')
  if (!isValidObjectId(id)) return c.json({ error: 'Invalid issue ID' }, 400)

  try {
    await connectToDatabase()
    const need = await Issue.findById(id).select('author').lean() as any
    if (!need) return c.json({ error: 'Issue not found' }, 404)

    const isAuthor = need.author.toString() === token.id
    const isAdmin  = token.role === 'admin'
    if (!isAuthor && !isAdmin) return c.json({ error: 'Forbidden' }, 403)

    await deleteIssueWithCleanup(id, isAdmin)
    return c.json({ ok: true })
  } catch (err) {
    console.error('[mobile/issues DELETE]', err)
    return c.json({ error: 'Failed to delete issue' }, 500)
  }
})

export default issueById
