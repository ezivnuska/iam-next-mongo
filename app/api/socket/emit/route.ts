import { NextRequest, NextResponse } from 'next/server'
import { emitViaAPI } from '../io'

export async function POST(req: NextRequest) {
    const secret = req.headers.get('x-internal-secret')
    if (!secret || secret !== process.env.INTERNAL_SECRET) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { event, data, room, excludeUserId } = await req.json()
    if (!event) return NextResponse.json({ error: 'event is required' }, { status: 400 })

    try {
        await emitViaAPI(event, data, room, excludeUserId)
        return NextResponse.json({ ok: true })
    } catch (err) {
        return NextResponse.json({ error: 'Socket.IO not initialized' }, { status: 503 })
    }
}
