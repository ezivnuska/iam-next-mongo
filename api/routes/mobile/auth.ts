// api/routes/mobile/auth.ts
// POST /api/mobile/login    — exchange email/password for JWT
// POST /api/mobile/register — create account + return JWT
// GET  /api/mobile/me       — return current user from JWT

import { Hono } from 'hono'
import { SignJWT, jwtVerify } from 'jose'
import bcrypt from 'bcrypt'
import { connectToDatabase } from '../../../app/lib/mongoose'
import UserModel from '../../../app/lib/models/user'
import '../../../app/lib/models/image'
import Rating from '../../../app/lib/models/rating'
import { loginRateLimit } from '../../middleware/rate-limit'

function getSecret(): Uint8Array {
  if (!process.env.NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET is not set')
  return new TextEncoder().encode(process.env.NEXTAUTH_SECRET)
}

const auth = new Hono()

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

auth.post('/api/mobile/login', loginRateLimit, async (c) => {
  try {
    const { email, password } = await c.req.json()
    if (!email || !password)
      return c.json({ error: 'Email and password are required' }, 400)
    if (!EMAIL_RE.test(email))
      return c.json({ error: 'Invalid email address' }, 400)

    await connectToDatabase()
    const userDoc = await UserModel.findOne({ email })
    if (!userDoc)
      return c.json({ error: 'Invalid email or password' }, 401)

    const isValid = await bcrypt.compare(password, userDoc.password)
    if (!isValid)
      return c.json({ error: 'Invalid email or password' }, 401)

    const token = await new SignJWT({
      id: userDoc._id.toString(),
      username: userDoc.username,
      email: userDoc.email,
      role: userDoc.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(getSecret())

    return c.json({ token })
  } catch (err) {
    console.error('[mobile/login POST]', err)
    return c.json({ error: 'Failed to login' }, 500)
  }
})

auth.post('/api/mobile/register', async (c) => {
  try {
    const { email, password, username } = await c.req.json()

    if (!email || !password)
      return c.json({ error: 'Email and password are required' }, 400)
    if (!EMAIL_RE.test(email))
      return c.json({ error: 'Invalid email address' }, 400)
    if (typeof password !== 'string' || password.length < 8)
      return c.json({ error: 'Password must be at least 8 characters' }, 400)
    if (!username)
      return c.json({ error: 'Username is required' }, 400)
    if (username.length < 2 || username.length > 20)
      return c.json({ error: 'Username must be between 2 and 20 characters' }, 400)
    if (!/^[a-zA-Z0-9_.-]{2,20}$/.test(username))
      return c.json({ error: 'Username may only contain letters, numbers, underscores, hyphens, and periods' }, 400)

    await connectToDatabase()

    const existingEmail = await UserModel.findOne({ email })
    if (existingEmail)
      return c.json({ error: 'Email is already registered' }, 400)

    const existingUsername = await UserModel.findOne({ username })
    if (existingUsername)
      return c.json({ error: 'Username is already taken' }, 400)

    const hashedPassword = await bcrypt.hash(password, 10)
    const newUser = new UserModel({
      email,
      password: hashedPassword,
      username,
      role: 'user',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    await newUser.save()

    const token = await new SignJWT({
      id: newUser._id.toString(),
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setExpirationTime('7d')
      .sign(getSecret())

    return c.json({ token }, 201)
  } catch (err) {
    console.error('[mobile/register POST]', err)
    return c.json({ error: 'Failed to register' }, 500)
  }
})

auth.get('/api/mobile/me', async (c) => {
  try {
    const authHeader = c.req.header('authorization')
    if (!authHeader?.startsWith('Bearer '))
      return c.json({ error: 'Unauthorized' }, 401)

    const { payload } = await jwtVerify(authHeader.slice(7), getSecret())

    await connectToDatabase()
    const userDoc = await UserModel.findById(payload.id as string).populate('avatar', '_id variants')
    if (!userDoc)
      return c.json({ error: 'User not found' }, 404)

    const avatar = userDoc.avatar
      ? { id: (userDoc.avatar as any)._id.toString(), variants: (userDoc.avatar as any).variants ?? [] }
      : null

    let reputation: { average: number; count: number } | null = null
    try {
      const ratings = await Rating.find({ workerId: userDoc._id }).lean() as any[]
      if (ratings.length > 0) {
        reputation = {
          average: Math.round((ratings.reduce((s, r) => s + r.score, 0) / ratings.length) * 10) / 10,
          count: ratings.length,
        }
      }
    } catch {}

    return c.json({
      id: userDoc._id.toString(),
      username: userDoc.username,
      email: userDoc.email,
      role: userDoc.role,
      bio: userDoc.bio,
      avatar,
      reputation,
    })
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401)
  }
})

export default auth
