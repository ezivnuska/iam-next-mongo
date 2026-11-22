// app/api/auth/socket-token/route.ts
// Issues a short-lived JWT for socket registration.
// Web clients fetch this on auth so they can register with the Socket.IO server
// using a verifiable token rather than an unverified userId.

import { NextResponse } from 'next/server'
import { auth } from '@/app/lib/auth'
import { signMobileToken } from '@/app/lib/jwt'

export async function GET(): Promise<Response> {
    const session = await auth()
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = await signMobileToken({
        id: session.user.id,
        username: session.user.username,
        role: session.user.role,
    }, '30m')

    return NextResponse.json({ token })
}
