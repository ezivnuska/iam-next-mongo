// app/api/socket/emit/route.ts
// Internal API route for server actions to emit socket events
// Also handles incoming client signals that trigger server-side actions

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
	try {
		const body = await request.json()
		const { event, room, data, excludeUserId, signal, gameId, userId, username } = body

		// Handle incoming client signals
		if (signal) {
			console.log('[Socket Emit Route] Received signal:', signal, 'for game:', gameId);

			if (signal === 'poker:join_game' && gameId && userId) {
				const { handlePlayerJoin } = await import('@/app/poker/lib/server/poker-game-controller');

				const result = await handlePlayerJoin(gameId, userId, username || 'Guest');

				if (!result.success) {
					const errorMessage = result.error || 'Failed to join game';
					console.error('[Socket Emit Route] Join error:', errorMessage);

					// Return appropriate error
					if (errorMessage.includes('locked')) {
						return NextResponse.json({ error: 'Game is locked - no new players allowed' }, { status: 409 });
					} else if (errorMessage.includes('full')) {
						return NextResponse.json({ error: 'Game is full' }, { status: 409 });
					} else if (errorMessage.includes('not found')) {
						return NextResponse.json({ error: 'Game not found' }, { status: 404 });
					}

					return NextResponse.json({ error: errorMessage }, { status: 500 });
				}

				return NextResponse.json({ success: true, gameState: result.gameState });
			}

			if (signal === 'poker:ready_for_next_turn' && gameId) {
				const { handleReadyForNextTurn } = await import('@/app/poker/lib/server/turn-handler');
				await handleReadyForNextTurn(gameId);
				return NextResponse.json({ success: true });
			}

			return NextResponse.json({ error: 'Unknown signal' }, { status: 400 });
		}

		console.log('[Socket Emit Route] Received emit request:', { event, room, hasData: !!data, excludeUserId });

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
			console.log('[Socket Emit Route] Emitting to room:', room);
			io.to(room).emit(event, data)
		} else {
			console.log('[Socket Emit Route] Broadcasting to ALL connected sockets');
			const connectedSockets = await io.fetchSockets();
			console.log('[Socket Emit Route] Number of connected sockets:', connectedSockets.length);
			io.emit(event, data)
		}

		console.log('[Socket Emit Route] Emit completed successfully');
		return NextResponse.json({ success: true })
	} catch (error: any) {
		console.error('Socket emit error:', error)
		return NextResponse.json({ error: error.message }, { status: 500 })
	}
}
