// app/api/mobile/users/[id]/route.ts
// GET — fetch a single user by ID with friendship status and reputation

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import { serializeResource, serializeFriendship } from '@/app/lib/mobile/serializers'
import UserModel from '@/app/lib/models/user'
import FriendshipModel from '@/app/lib/models/friendship'
import Rating from '@/app/lib/models/rating'

export const GET = withAuth(async (req, token, ctx) => {
  const { id: userId } = await ctx.params
  try {
    await connectToDatabase()
    await import('@/app/lib/models/image')

    const [userDoc, friendship, ratings] = await Promise.all([
      UserModel.findById(userId).populate('avatar', '_id variants').lean(),
      FriendshipModel.findOne({
        $or: [
          { requester: token.id, recipient: userId },
          { requester: userId, recipient: token.id },
        ],
      }).lean(),
      Rating.find({ workerId: userId }).lean() as Promise<any[]>,
    ])

    if (!userDoc) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    const reputation = ratings.length === 0 ? null : {
      average: Math.round((ratings.reduce((s: number, r: any) => s + r.score, 0) / ratings.length) * 10) / 10,
      count: ratings.length,
    }

    return NextResponse.json({
      user: {
        id: (userDoc as any)._id.toString(),
        username: (userDoc as any).username,
        bio: (userDoc as any).bio ?? '',
        avatar: serializeResource((userDoc as any).avatar),
        friendship: serializeFriendship(friendship, token.id),
        reputation,
      },
    })
  } catch (err) {
    console.error('[mobile/users/:id GET]', err)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
})
