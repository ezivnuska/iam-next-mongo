// app/api/socket/emit/route.ts
// Internal API route for server actions to emit socket events

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
	const secret = request.headers.get('x-internal-secret')
	if (!secret || secret !== process.env.INTERNAL_SECRET) {
		return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
	}

	try {
		const body = await request.json()
		const { event, room, data, excludeUserId } = body

		if (typeof global.io === 'undefined') {
			console.error('Socket.IO not initialized')
			return NextResponse.json({ error: 'Socket.IO not initialized' }, { status: 500 })
		}

		const io = global.io as any

		if (excludeUserId) {
			const sockets = await io.fetchSockets()
			for (const socket of sockets) {
				if (socket.userId !== excludeUserId) {
					if (room) {
						if (socket.rooms.has(room)) {
							socket.emit(event, data)
						}
					} else {
						socket.emit(event, data)
					}
				}
			}
		} else if (room) {
			io.to(room).emit(event, data)
		} else {
			io.emit(event, data)
		}

		return NextResponse.json({ success: true })
	} catch (error: any) {
		console.error('Socket emit error:', error)
		return NextResponse.json({ error: error.message }, { status: 500 })
	}
}
