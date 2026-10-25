import { NextRequest, NextResponse } from 'next/server'
import bcrypt from 'bcrypt'
import { connectToDatabase } from '@/app/lib/mongoose'
import UserModel from '@/app/lib/models/user'
import { signMobileToken } from '@/app/lib/utils/mobileJwt'
import { formatUserForMobile } from '@/app/lib/utils/formatMobileUser'

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 })
    }

    await connectToDatabase()

    const user = await UserModel.findOne({ email: email.trim().toLowerCase() }).populate('avatar')
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const valid = await bcrypt.compare(password, user.password)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 })
    }

    const token = signMobileToken(user._id.toString())
    return NextResponse.json({ token, user: formatUserForMobile(user) })
  } catch (err) {
    console.error('[mobile/login]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
