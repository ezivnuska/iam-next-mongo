// api/routes/mobile/auth.ts
// POST /api/mobile/login    — exchange email/password for JWT
// POST /api/mobile/register — create account + return JWT

import { Hono } from 'hono'
import { ZodError } from 'zod'
import bcrypt from 'bcrypt'
import { connectToDatabase } from '@/app/lib/mongoose'
import UserModel from '@/app/lib/models/user'
import { loginRateLimit } from '../../middleware/rate-limit'
import { signMobileToken } from '@/app/lib/jwt'
import { loginRequestSchema, registerRequestSchema } from '../../lib/schemas/auth'

const auth = new Hono()

auth.post('/api/mobile/login', loginRateLimit, async (c) => {
  try {
    const { email, password } = loginRequestSchema.parse(await c.req.json())

    await connectToDatabase()
    const userDoc = await UserModel.findOne({ email })
    if (!userDoc)
      return c.json({ error: 'Invalid email or password' }, 401)

    const isValid = await bcrypt.compare(password, userDoc.password)
    if (!isValid)
      return c.json({ error: 'Invalid email or password' }, 401)

    const token = await signMobileToken({
      id: userDoc._id.toString(),
      username: userDoc.username,
      email: userDoc.email,
      role: userDoc.role,
    })

    return c.json({ token })
  } catch (err) {
    if (err instanceof ZodError)
      return c.json({ error: err.errors[0].message }, 400)
    console.error('[mobile/login POST]', err)
    return c.json({ error: 'Failed to login' }, 500)
  }
})

auth.post('/api/mobile/register', async (c) => {
  try {
    const { email, password, username } = registerRequestSchema.parse(await c.req.json())

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

    const token = await signMobileToken({
      id: newUser._id.toString(),
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
    })

    return c.json({ token }, 201)
  } catch (err) {
    if (err instanceof ZodError)
      return c.json({ error: err.errors[0].message }, 400)
    console.error('[mobile/register POST]', err)
    return c.json({ error: 'Failed to register' }, 500)
  }
})

export default auth
