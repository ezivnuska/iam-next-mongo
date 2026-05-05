// app/api/mobile/users/[id]/route.ts
// GET — fetch a single user by ID with friendship status for the current user

import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import { withAuth } from '@/app/lib/mobile/withAuth'
import { serializeResource, serializeFriendship } from '@/app/lib/mobile/serializers'
import UserModel from '@/app/lib/models/user'
import FriendshipModel from '@/app/lib/models/friendship'

export const GET = withAuth(async (req, token, ctx) => {
  const { id: userId } = await ctx.params
  try {
    await connectToDatabase()
    await import('@/app/lib/models/image')

    const [userDoc, friendship] = await Promise.all([
      UserModel.findById(userId).populate('avatar', '_id variants').lean(),
      FriendshipModel.findOne({
        $or: [
          { requester: token.id, recipient: userId },
          { requester: userId, recipient: token.id },
        ],
      }).lean(),
    ])

    if (!userDoc) return NextResponse.json({ error: 'User not found' }, { status: 404 })

    return NextResponse.json({
      user: {
        id: (userDoc as any)._id.toString(),
        username: (userDoc as any).username,
        bio: (userDoc as any).bio ?? '',
        avatar: serializeResource((userDoc as any).avatar),
        friendship: serializeFriendship(friendship, token.id),
      },
    })
  } catch (err) {
    console.error('[mobile/users/:id GET]', err)
    return NextResponse.json({ error: 'Failed to fetch user' }, { status: 500 })
  }
})
