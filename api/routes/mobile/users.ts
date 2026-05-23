// api/routes/mobile/users.ts
// GET /api/mobile/users      — list all users with friendship status
// GET /api/mobile/users/:id  — fetch single user with friendship + reputation

import { Hono } from 'hono'
import { authMiddleware, TokenPayload } from '../../middleware/auth'
import { connectToDatabase } from '../../../app/lib/mongoose'
import { serializeResource, serializeFriendshipEntry, serializeFriendship } from '../../../app/lib/mobile/serializers'
import UserModel from '../../../app/lib/models/user'
import FriendshipModel from '../../../app/lib/models/friendship'
import Rating from '../../../app/lib/models/rating'
import '../../../app/lib/models/image'

const users = new Hono<{ Variables: { token: TokenPayload } }>()

users.get('/api/mobile/users', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    await connectToDatabase()

    const [userList, friendships] = await Promise.all([
      UserModel.find({ _id: { $ne: token.id } }).populate('avatar', '_id variants').lean(),
      FriendshipModel.find({
        $or: [{ requester: token.id }, { recipient: token.id }],
      }).lean(),
    ])

    const friendshipMap = new Map<string, { id: string; status: string; role: 'requester' | 'recipient' }>()
    for (const f of friendships as any[]) {
      const requesterId = f.requester.toString()
      const recipientId = f.recipient.toString()
      const otherUserId = requesterId === token.id ? recipientId : requesterId
      const role = requesterId === token.id ? 'requester' : 'recipient'
      friendshipMap.set(otherUserId, { id: f._id.toString(), status: f.status, role })
    }

    const serialized = (userList as any[]).map((u) => ({
      id: u._id.toString(),
      username: u.username,
      bio: u.bio ?? '',
      avatar: serializeResource(u.avatar),
      friendship: serializeFriendshipEntry(friendshipMap.get(u._id.toString())),
    }))

    return c.json({ users: serialized })
  } catch (err) {
    console.error('[mobile/users GET]', err)
    return c.json({ error: 'Failed to fetch users' }, 500)
  }
})

users.get('/api/mobile/users/:id', authMiddleware, async (c) => {
  const token = c.get('token')
  const userId = c.req.param('id')
  try {
    await connectToDatabase()

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

    if (!userDoc) return c.json({ error: 'User not found' }, 404)

    const reputation = ratings.length === 0 ? null : {
      average: Math.round((ratings.reduce((s: number, r: any) => s + r.score, 0) / ratings.length) * 10) / 10,
      count: ratings.length,
    }

    return c.json({
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
    return c.json({ error: 'Failed to fetch user' }, 500)
  }
})

export default users
