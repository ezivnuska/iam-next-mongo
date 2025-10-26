// app/api/socket/emit/route.ts
// Internal API route for server actions to emit socket events

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
	try {
		const { event, room, data } = await request.json()

		if (typeof global.io === 'undefined') {
			console.error('Socket.IO not initialized')
			return NextResponse.json({ error: 'Socket.IO not initialized' }, { status: 500 })
		}

		const io = global.io as any

		// Emit the event
		if (room) {
			console.log(`[Socket Emit] ${event} to room ${room}:`, data)
			io.to(room).emit(event, data)
		} else {
			console.log(`[Socket Emit] ${event} (broadcast):`, data)
			io.emit(event, data)
		}

		return NextResponse.json({ success: true })
	} catch (error: any) {
		console.error('Socket emit error:', error)
		return NextResponse.json({ error: error.message }, { status: 500 })
	}
}
