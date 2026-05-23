// api/routes/mobile/me.ts
// PATCH /api/mobile/profile/bio — update bio

import { Hono } from 'hono'
import { authMiddleware, TokenPayload } from '../../middleware/auth'
import { connectToDatabase } from '../../../app/lib/mongoose'
import UserModel from '../../../app/lib/models/user'
import '../../../app/lib/models/image'

const me = new Hono<{ Variables: { token: TokenPayload } }>()

me.patch('/api/mobile/profile/bio', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    const { bio } = await c.req.json()
    if (typeof bio !== 'string')
      return c.json({ error: 'Bio must be a string' }, 400)

    const trimmedBio = bio.trim()
    if (trimmedBio.length > 500)
      return c.json({ error: 'Bio must be 500 characters or less' }, 400)

    const sanitizedBio = trimmedBio
      .replace(/<[^>]*>/g, '')
      .replace(/&(?:[a-z\d]+|#\d+|#x[a-f\d]+);/gi, '')

    await connectToDatabase()
    const userDoc = await UserModel.findByIdAndUpdate(
      token.id,
      { bio: sanitizedBio },
      { new: true }
    ).populate('avatar', '_id variants')

    if (!userDoc)
      return c.json({ error: 'User not found' }, 404)

    const avatar = userDoc.avatar
      ? { id: (userDoc.avatar as any)._id.toString(), variants: (userDoc.avatar as any).variants ?? [] }
      : null

    return c.json({
      user: {
        id: userDoc._id.toString(),
        username: userDoc.username,
        email: userDoc.email,
        role: userDoc.role,
        bio: userDoc.bio,
        avatar,
      },
    })
  } catch (err) {
    console.error('[profile/bio PATCH]', err)
    return c.json({ error: 'Failed to update bio' }, 500)
  }
})

export default me
