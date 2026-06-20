// app/api/socket/io.ts
// Socket.IO instance and helper for server-side use

import { Server as SocketIOServer } from 'socket.io'

declare global {
	var io: SocketIOServer | undefined
}

export function getIO(): SocketIOServer | null {
	if (typeof global.io === 'undefined') {
		return null
	}
	return global.io
}

export async function emitViaAPI(event: string, data: unknown, room?: string, excludeUserId?: string) {
	const io = global.io
	if (io) {
		if (excludeUserId) {
			const sockets = await io.fetchSockets()
			for (const socket of sockets) {
				if ((socket.data as { userId?: string }).userId !== excludeUserId) {
					if (!room || socket.rooms.has(room)) socket.emit(event, data)
				}
			}
		} else if (room) {
			io.to(room).emit(event, data)
		} else {
			io.emit(event, data)
		}
		return
	}

	const response = await fetch(`http://localhost:${process.env.PORT ?? '3000'}/api/socket/emit`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'x-internal-secret': process.env.INTERNAL_SECRET ?? '',
		},
		body: JSON.stringify({ event, data, room, excludeUserId }),
	})

	if (!response.ok) {
		const errorText = await response.text()
		throw new Error(`Socket emit failed: ${errorText}`)
	}
}
