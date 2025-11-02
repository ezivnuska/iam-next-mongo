// app/api/socket/emit/route.ts
// Internal API route for server actions to emit socket events

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
	try {
		const { event, room, data, excludeUserId } = await request.json()

		if (typeof global.io === 'undefined') {
			console.error('Socket.IO not initialized')
			return NextResponse.json({ error: 'Socket.IO not initialized' }, { status: 500 })
		}

		const io = global.io as any

		// Emit the event
		if (excludeUserId) {
			// Emit to all sockets except those belonging to excludeUserId
			const sockets = await io.fetchSockets()
			for (const socket of sockets) {
				// Check if this socket belongs to the excluded user
				if (socket.userId !== excludeUserId) {
					if (room) {
						// Check if socket is in the room before emitting
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
