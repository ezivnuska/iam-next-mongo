// api/routes/mobile/issues/lists.ts
// GET /api/mobile/issues/feed    — all issues feed
// GET /api/mobile/issues/nearby  — nearest open issue within ~100 m
// GET /api/mobile/issues/work    — issues the current user has applied to
// GET /api/mobile/issues/mine    — issues where user is author, accepted worker, or contributor
// GET /api/mobile/issues/counts  — active/completed counts
// GET /api/mobile/issues/flagged — admin: flagged issues

import { Hono } from 'hono'
import mongoose from 'mongoose'
import { authMiddleware, TokenPayload } from '../../../middleware/auth'
import { connectToDatabase } from '../../../../app/lib/mongoose'
import { serializeIssue } from '../../../../app/lib/mobile/serializers'
import { attachIssueData } from '../../../../app/lib/mobile/attachIssueData'
import Issue from '../../../../app/lib/models/issue'
import Applicant from '../../../../app/lib/models/applicant'
import Pledge from '../../../../app/lib/models/pledge'
import '../../../../app/lib/models/image'
import '../../../../app/lib/models/user'

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

const lists = new Hono<{ Variables: { token: TokenPayload } }>()

lists.get('/api/mobile/issues/counts', authMiddleware, async (c) => {
  try {
    await connectToDatabase()
    const [active, completed] = await Promise.all([
      Issue.countDocuments({ status: { $ne: 'completed' } }),
      Issue.countDocuments({ status: 'completed' }),
    ])
    return c.json({ active, completed })
  } catch (err) {
    console.error('[mobile/issues/counts GET]', err)
    return c.json({ error: 'Failed to fetch counts' }, 500)
  }
})

lists.get('/api/mobile/issues/feed', authMiddleware, async (c) => {
  try {
    await connectToDatabase()
    const status = c.req.query('status') ?? 'open'
    const query = status === 'open'
      ? { $or: [{ status: 'open' }, { status: 'completed' }, { status: { $exists: false } }], flagged: { $ne: true } }
      : { status, flagged: { $ne: true } }

    const limit = Math.min(parseInt(c.req.query('limit') ?? '100'), 200)
    const issues = await Issue.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate({ path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } })
      .populate('images')
      .lean()

    const issuesWithData = await attachIssueData(issues as any[])
    return c.json({ issues: issuesWithData.map(serializeIssue) })
  } catch (err) {
    console.error('[mobile/issues/feed GET]', err)
    return c.json({ error: 'Failed to fetch issues' }, 500)
  }
})

lists.get('/api/mobile/issues/flagged', authMiddleware, async (c) => {
  const token = c.get('token')
  if (token.role !== 'admin') return c.json({ error: 'Forbidden' }, 403)
  try {
    await connectToDatabase()
    const issues = await Issue.find({ flagged: true })
      .sort({ createdAt: -1 })
      .populate({ path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } })
      .populate('images')
      .lean()
    const issuesWithData = await attachIssueData(issues as any[])
    return c.json({ issues: issuesWithData.map(serializeIssue) })
  } catch (err) {
    console.error('[mobile/issues/flagged GET]', err)
    return c.json({ error: 'Failed to fetch flagged issues' }, 500)
  }
})

lists.get('/api/mobile/issues/nearby', authMiddleware, async (c) => {
  const latParam = c.req.query('lat')
  const lngParam = c.req.query('lng')
  const lat = latParam !== null && latParam !== undefined ? parseFloat(latParam) : NaN
  const lng = lngParam !== null && lngParam !== undefined ? parseFloat(lngParam) : NaN

  if (!isFinite(lat) || !isFinite(lng))
    return c.json({ error: 'lat and lng must be finite numbers' }, 400)

  try {
    await connectToDatabase()
    const DELTA = 0.002
    const candidates = await Issue.find({
      status: 'open',
      'location.latitude': { $gte: lat - DELTA, $lte: lat + DELTA },
      'location.longitude': { $gte: lng - DELTA, $lte: lng + DELTA },
    })
      .populate({ path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } })
      .populate('images')
      .lean()

    const match = candidates.find((doc) => {
      const loc = (doc as any).location
      if (!loc?.latitude || !loc?.longitude) return false
      return haversineMeters(lat, lng, loc.latitude, loc.longitude) < 100
    })

    if (!match) return c.json({ issue: null })
    const issue = serializeIssue({ ...match, pledged: [], applicants: [] })
    return c.json({ issue })
  } catch (err) {
    console.error('[mobile/issues/nearby GET]', err)
    return c.json({ error: 'Failed to check nearby issues' }, 500)
  }
})

lists.get('/api/mobile/issues/mine', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    await connectToDatabase()
    const userId = new mongoose.Types.ObjectId(token.id)

    const [applicantRecords, pledgeRecords] = await Promise.all([
      Applicant.find({ userId, status: 'accepted' }).lean(),
      Pledge.find({ userId }).lean(),
    ])

    const acceptedIssueIds = applicantRecords.map((a) => a.issueId)
    const pledgedIssueIds  = pledgeRecords.map((p) => p.issueId)

    const issues = await Issue.find({
      status: { $ne: 'completed' },
      $or: [
        { author: userId },
        { _id: { $in: acceptedIssueIds } },
        { _id: { $in: pledgedIssueIds } },
      ],
    })
      .sort({ createdAt: -1 })
      .populate({ path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } })
      .populate('images')
      .lean()

    const issuesWithData = await attachIssueData(issues as any[])
    return c.json({ issues: issuesWithData.map(serializeIssue) })
  } catch (err) {
    console.error('[mobile/issues/mine GET]', err)
    return c.json({ error: 'Failed to fetch issues' }, 500)
  }
})

lists.get('/api/mobile/issues/work', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    await connectToDatabase()
    const userId = new mongoose.Types.ObjectId(token.id)
    const applicantRecords = await Applicant.find({ userId }).lean()
    const issueIds = applicantRecords.map((a) => a.issueId)

    if (issueIds.length === 0) return c.json({ issues: [] })

    const issues = await Issue.find({ _id: { $in: issueIds } })
      .sort({ createdAt: -1 })
      .populate({ path: 'author', select: '_id username avatar', populate: { path: 'avatar', select: '_id variants' } })
      .populate('images')
      .lean()

    const issuesWithData = await attachIssueData(issues as any[])
    return c.json({ issues: issuesWithData.map(serializeIssue) })
  } catch (err) {
    console.error('[mobile/issues/work GET]', err)
    return c.json({ error: 'Failed to fetch work issues' }, 500)
  }
})

export default lists
