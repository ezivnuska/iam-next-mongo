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
	if (!io) {
		throw new Error('Socket.IO is not initialized')
	}

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
}
