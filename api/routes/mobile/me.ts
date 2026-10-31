// api/routes/mobile/me.ts
// GET  /api/mobile/me               — fetch full authenticated user
// PATCH /api/mobile/profile/bio     — update bio

import { Hono } from 'hono'
import { ZodError } from 'zod'
import { authMiddleware, TokenPayload } from '../../middleware/auth'
import { connectToDatabase } from '@/app/lib/mongoose'
import UserModel from '@/app/lib/models/user'
import '@/app/lib/models/image'
import { updateBioRequestSchema } from '../../lib/schemas/user'

const me = new Hono<{ Variables: { token: TokenPayload } }>()

me.get('/api/mobile/me', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    await connectToDatabase()
    const userDoc = await UserModel.findById(token.id).populate('avatar', '_id userId username alt variants').lean() as any
    if (!userDoc) return c.json({ error: 'User not found' }, 404)

    const avatarDoc = userDoc.avatar
    const avatar = avatarDoc && typeof avatarDoc === 'object' && avatarDoc._id
      ? {
          id: avatarDoc._id.toString(),
          userId: avatarDoc.userId?.toString() ?? null,
          username: avatarDoc.username ?? null,
          alt: avatarDoc.alt ?? '',
          variants: (avatarDoc.variants ?? []).map((v: any) => ({
            size: v.size, filename: v.filename, width: v.width, height: v.height, url: v.url,
          })),
        }
      : null

    return c.json({
      user: {
        id: userDoc._id.toString(),
        username: userDoc.username,
        email: userDoc.email,
        role: userDoc.role,
        bio: userDoc.bio ?? '',
        avatar,
        verified: userDoc.verified ?? false,
        createdAt: userDoc.createdAt?.toISOString() ?? null,
        updatedAt: userDoc.updatedAt?.toISOString() ?? null,
        emailVerified: userDoc.emailVerified?.toISOString() ?? null,
      },
    })
  } catch (err) {
    console.error('[mobile/me GET]', err)
    return c.json({ error: 'Failed to fetch user' }, 500)
  }
})

me.patch('/api/mobile/profile/bio', authMiddleware, async (c) => {
  const token = c.get('token')
  try {
    const { bio: rawBio } = updateBioRequestSchema.parse(await c.req.json())

    const sanitizedBio = rawBio.trim()
      .replace(/<[^>]*>/g, '')
      .replace(/&(?:[a-z\d]+|#\d+|#x[a-f\d]+);/gi, '')

    await connectToDatabase()
    const userDoc = await UserModel.findByIdAndUpdate(token.id, { bio: sanitizedBio },
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
    if (err instanceof ZodError)
      return c.json({ error: err.errors[0].message }, 400)
    console.error('[profile/bio PATCH]', err)
    return c.json({ error: 'Failed to update bio' }, 500)
  }
})

export default me
