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

// Helper function to emit events via internal API route
// This works around the issue where API routes run in a different process
export async function emitViaAPI(event: string, data: any, room?: string, excludeUserId?: string) {
	try {
		const response = await fetch('http://localhost:3000/api/socket/emit', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ event, data, room, excludeUserId }),
		})

		if (!response.ok) {
			const errorText = await response.text()
			throw new Error(`Socket emit failed: ${errorText}`)
		}

		return await response.json()
	} catch (error) {
		console.error('Socket emit error:', error)
		throw error
	}
}
