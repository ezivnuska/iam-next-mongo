import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { connectToDatabase } from '@/app/lib/mongoose'
import UserModel from '@/app/lib/models/user'
import { signMobileToken } from '@/app/lib/utils/mobileJwt'
import { formatUserForMobile } from '@/app/lib/utils/formatMobileUser'

export async function POST(req: NextRequest) {
  try {
    const { username, email, password } = await req.json()

    if (!username || !email || !password) {
      return NextResponse.json({ error: 'Username, email and password are required' }, { status: 400 })
    }

    await connectToDatabase()

    const existing = await UserModel.findOne({
      $or: [{ email: email.trim().toLowerCase() }, { username: username.trim() }],
    })
    if (existing) {
      const field = existing.email === email.trim().toLowerCase() ? 'Email' : 'Username'
      return NextResponse.json({ error: `${field} is already taken` }, { status: 400 })
    }

    const hashed = await bcrypt.hash(password, 10)
    const user = await UserModel.create({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: hashed,
      role: 'user',
    })

    const token = signMobileToken(user._id.toString())
    return NextResponse.json({ token, user: formatUserForMobile(user) }, { status: 201 })
  } catch (err) {
    console.error('[mobile/register]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
