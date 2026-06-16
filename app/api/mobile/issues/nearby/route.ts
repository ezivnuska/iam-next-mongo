// app/api/mobile/issues/nearby/route.ts
// GET — find the nearest open issue within ~100 m of the given lat/lng

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import { serializeIssue } from '@/app/lib/mobile/serializers'
import Issue from '@/app/lib/models/issue'
import '@/app/lib/models/user'
import '@/app/lib/models/image'

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000
  const toRad = (d: number) => d * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

export const GET = withAuth(async (req, token) => {
  const { searchParams } = new URL(req.url)
  const latParam = searchParams.get('lat')
  const lngParam = searchParams.get('lng')

  const lat = latParam !== null ? parseFloat(latParam) : NaN
  const lng = lngParam !== null ? parseFloat(lngParam) : NaN

  if (!isFinite(lat) || !isFinite(lng)) {
    return NextResponse.json({ error: 'lat and lng must be finite numbers' }, { status: 400 })
  }

  try {
    await connectToDatabase()

    const DELTA = 0.002
    const candidates = await Issue.find({
      status: 'open',
      'location.latitude':  { $gte: lat - DELTA, $lte: lat + DELTA },
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

    if (!match) {
      return NextResponse.json({ issue: null })
    }

    const issue = serializeIssue({ ...match, pledged: [], applicants: [] })
    return NextResponse.json({ issue })
  } catch (err) {
    console.error('[mobile/issues/nearby GET]', err)
    return NextResponse.json({ error: 'Failed to check nearby issues' }, { status: 500 })
  }
})
