// api/routes/mobile/friendships.ts
// POST   /api/mobile/friendships      — send friend request
// PATCH  /api/mobile/friendships/:id  — accept or reject
// DELETE /api/mobile/friendships/:id  — remove or cancel

import { Hono } from 'hono'
import { authMiddleware, TokenPayload } from '../../middleware/auth'
import { connectToDatabase } from '../../../app/lib/mongoose'
import FriendshipModel from '../../../app/lib/models/friendship'
import UserModel from '../../../app/lib/models/user'
import {
  emitFriendRequest,
  emitFriendRequestAccepted,
  emitFriendRequestRejected,
  emitFriendshipRemoved,
} from '../../lib/socketEmit'

const friendships = new Hono<{ Variables: { token: TokenPayload } }>()

async function emitFriendRequestSent(friendshipId: string, requesterId: string, recipientId: string) {
  try {
    const [requester, recipient] = await Promise.all([
      UserModel.findById(requesterId).lean(),
      UserModel.findById(recipientId).lean(),
    ])
    if (!requester || !recipient) return
    await emitFriendRequest({
      friendshipId,
      requester: { id: requesterId, username: (requester as any).username },
      recipient: { id: recipientId, username: (recipient as any).username },
    })
  } catch (err) {
    console.error('[mobile/friendships] emitFriendRequestSent failed:', err)
  }
}

friendships.post('/api/mobile/friendships', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    const { recipientId } = await c.req.json()

    if (!recipientId || typeof recipientId !== 'string')
      return c.json({ error: 'recipientId is required' }, 400)
    if (!/^[a-f\d]{24}$/i.test(recipientId))
      return c.json({ error: 'Invalid recipientId' }, 400)
    if (recipientId === token.id)
      return c.json({ error: 'Cannot send friend request to yourself' }, 400)

    await connectToDatabase()

    const existing = await FriendshipModel.findOne({
      $or: [
        { requester: token.id, recipient: recipientId },
        { requester: recipientId, recipient: token.id },
      ],
    })

    if (existing) {
      const status = (existing as any).status
      if (status === 'accepted') return c.json({ error: 'Already friends' }, 400)
      if (status === 'pending') return c.json({ error: 'Friend request already pending' }, 400)
      if (status === 'rejected') {
        ;(existing as any).status = 'pending'
        ;(existing as any).requester = token.id
        ;(existing as any).recipient = recipientId
        await (existing as any).save()
        await emitFriendRequestSent((existing as any)._id.toString(), token.id, recipientId)
        return c.json({ friendship: { id: (existing as any)._id.toString(), status: 'pending_sent' } })
      }
    }

    const friendship = await FriendshipModel.create({ requester: token.id, recipient: recipientId, status: 'pending' })
    await emitFriendRequestSent((friendship as any)._id.toString(), token.id, recipientId)
    return c.json({ friendship: { id: (friendship as any)._id.toString(), status: 'pending_sent' } }, 201)
  } catch (err) {
    console.error('[mobile/friendships POST]', err)
    return c.json({ error: 'Failed to send friend request' }, 500)
  }
})

friendships.patch('/api/mobile/friendships/:id', authMiddleware, async (c) => {
  const token = c.get('token')
  const id = c.req.param('id')
  try {
    const { action } = await c.req.json()
    if (action !== 'accept' && action !== 'reject')
      return c.json({ error: "action must be 'accept' or 'reject'" }, 400)

    await connectToDatabase()
    const friendship = await FriendshipModel.findById(id)
    if (!friendship) return c.json({ error: 'Friendship not found' }, 404)

    const requesterId = (friendship as any).requester.toString()
    const recipientId = (friendship as any).recipient.toString()
    if (recipientId !== token.id)
      return c.json({ error: 'Only the recipient can accept or reject' }, 403)

    ;(friendship as any).status = action === 'accept' ? 'accepted' : 'rejected'
    await (friendship as any).save()

    try {
      const recipient = await UserModel.findById(recipientId).lean()
      const username = (recipient as any)?.username ?? ''
      const payload = { friendshipId: id, userId: requesterId, username, otherUserId: recipientId }
      if (action === 'accept') await emitFriendRequestAccepted(payload)
      else await emitFriendRequestRejected(payload)
    } catch (err) {
      console.error('[mobile/friendships PATCH] socket emit failed:', err)
    }

    return c.json({ friendship: { id: (friendship as any)._id.toString(), status: action === 'accept' ? 'accepted' : 'none' } })
  } catch (err) {
    console.error('[mobile/friendships PATCH]', err)
    return c.json({ error: 'Failed to update friendship' }, 500)
  }
})

friendships.delete('/api/mobile/friendships/:id', authMiddleware, async (c) => {
  const token = c.get('token')
  const id = c.req.param('id')
  try {
    await connectToDatabase()
    const friendship = await FriendshipModel.findById(id)
    if (!friendship) return c.json({ error: 'Friendship not found' }, 404)

    const requesterId = (friendship as any).requester.toString()
    const recipientId = (friendship as any).recipient.toString()
    if (requesterId !== token.id && recipientId !== token.id)
      return c.json({ error: 'Not authorized' }, 403)

    await FriendshipModel.deleteOne({ _id: id })

    try {
      const otherUserId = requesterId === token.id ? recipientId : requesterId
      const currentUser = await UserModel.findById(token.id).lean()
      const username = (currentUser as any)?.username ?? ''
      await emitFriendshipRemoved({ friendshipId: id, userId: otherUserId, username, otherUserId: token.id })
    } catch (err) {
      console.error('[mobile/friendships DELETE] socket emit failed:', err)
    }

    return c.json({ ok: true })
  } catch (err) {
    console.error('[mobile/friendships DELETE]', err)
    return c.json({ error: 'Failed to remove friendship' }, 500)
  }
})

export default friendships
