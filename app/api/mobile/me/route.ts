import { NextRequest, NextResponse } from 'next/server'
import { connectToDatabase } from '@/app/lib/mongoose'
import UserModel from '@/app/lib/models/user'
import { getMobileUserId } from '@/app/lib/utils/mobileJwt'
import { formatUserForMobile } from '@/app/lib/utils/formatMobileUser'

export async function GET(req: NextRequest) {
  try {
    const userId = getMobileUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await connectToDatabase()

    const user = await UserModel.findById(userId).populate('avatar')
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    return NextResponse.json(formatUserForMobile(user))
  } catch (err) {
    console.error('[mobile/me]', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
