// server.js
// Custom Next.js server with Socket.IO support

const { createServer } = require('http')
const { parse } = require('url')
const next = require('next')
const { Server } = require('socket.io')

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()

app.prepare().then(() => {
	const httpServer = createServer(async (req, res) => {
		try {
			const parsedUrl = parse(req.url, true)
			await handle(req, res, parsedUrl)
		} catch (err) {
			console.error('Error occurred handling', req.url, err)
			res.statusCode = 500
			res.end('internal server error')
		}
	})

	// Initialize Socket.IO
	const io = new Server(httpServer, {
		path: '/api/socket/io',
		cors: {
			origin: process.env.NEXT_PUBLIC_APP_URL || `http://${hostname}:${port}`,
			methods: ['GET', 'POST'],
		},
		transports: ['websocket', 'polling'],
	})

	// Store the io instance globally for use in API routes/actions
	global.io = io

	// Track online users
	const onlineUsers = new Map() // Map<userId, Set<socketId>>

	// Socket.IO connection handling
	io.on('connection', (socket) => {
		// Handle user registration (join user-specific room)
		socket.on('register', async (userId) => {
			if (userId) {
				socket.join(`user:${userId}`)
				socket.userId = userId

				// Track this user as online
				const isNewUser = !onlineUsers.has(userId)
				if (isNewUser) {
					onlineUsers.set(userId, new Set())
				}
				onlineUsers.get(userId).add(socket.id)

				// Use setImmediate to ensure the event loop processes this after current operations
				setImmediate(() => {
					// Send current online users list to the newly connected user (including themselves)
					const currentOnlineUsers = Array.from(onlineUsers.keys())
					socket.emit('users:online', { userIds: currentOnlineUsers })

					// If this is a new user going online, notify others (not the user themselves)
					if (isNewUser) {
						socket.broadcast.emit('user:online', { userId })
					}
				})

				// Check if user is in a poker game and clear their away status
				try {
					const response = await fetch(`http://localhost:${port}/api/socket/emit`, {
						method: 'POST',
						headers: { 'Content-Type': 'application/json' },
						body: JSON.stringify({
							signal: 'poker:player_reconnected',
							userId: userId
						}),
					});

					if (!response.ok) {
						// Silently fail - user might not be in a game
						console.log('[Socket] Player reconnection check completed (no active game)');
					}
				} catch (error) {
					// Silently fail - this is just a helper to clear away status
					console.error('[Socket] Error checking poker game on reconnect:', error.message);
				}
			}
		})

		// Handle poker game join
		socket.on('poker:join_game', async ({ gameId, username }) => {
			console.log('[Socket] Received poker:join_game for game:', gameId, 'user:', socket.userId);

			try {
				// User must be registered first
				if (!socket.userId) {
					socket.emit('poker:join_error', { error: 'Not authenticated - register first' });
					return;
				}

				// Delegate to API route which handles all the join logic
				const response = await fetch(`http://localhost:${port}/api/socket/emit`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						signal: 'poker:join_game',
						gameId,
						userId: socket.userId,
						username: username || 'Guest'
					}),
				});

				const result = await response.json();

				if (!response.ok) {
					console.error('[Socket] Join failed:', result.error);
					socket.emit('poker:join_error', { error: result.error });
				} else {
					console.log('[Socket] Successfully joined game');

					// Update socket.userId if a new guest ID was assigned
					if (result.userId && socket.userId === 'guest-pending') {
						console.log('[Socket] Updating socket.userId from guest-pending to', result.userId);
						socket.userId = result.userId;

						// Update the socket room membership
						socket.leave(`user:guest-pending`);
						socket.join(`user:${result.userId}`);
					}

					// Success event will be sent via emitPlayerJoined and emitStateUpdate
					socket.emit('poker:join_success', {
					gameState: result.gameState,
					userId: result.userId,
					username: result.username
				});
				}
			} catch (error) {
				console.error('[Socket] Error processing join_game:', error);
				socket.emit('poker:join_error', { error: error.message || 'Failed to join game' });
			}
		});

		// Handle poker game leave
		socket.on('poker:leave_game', async ({ gameId }) => {
			console.log('[Socket] Received poker:leave_game for game:', gameId, 'user:', socket.userId);

			try {
				// User must be registered first
				if (!socket.userId) {
					socket.emit('poker:leave_error', { error: 'Not authenticated - register first' });
					return;
				}

				// Delegate to API route which handles all the leave logic
				const response = await fetch(`http://localhost:${port}/api/socket/emit`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						signal: 'poker:leave_game',
						gameId,
						userId: socket.userId
					}),
				});

				const result = await response.json();

				if (!response.ok) {
					console.error('[Socket] Leave failed:', result.error);
					socket.emit('poker:leave_error', { error: result.error });
				} else {
					console.log('[Socket] Successfully left game');
					// Success event will be sent via emitPlayerLeft
					socket.emit('poker:leave_success', { gameState: result.gameState });
				}
			} catch (error) {
				console.error('[Socket] Error processing leave_game:', error);
				socket.emit('poker:leave_error', { error: error.message || 'Failed to leave game' });
			}
		});

		// Handle ready for next turn signal from client (after notifications complete)
		socket.on('poker:ready_for_next_turn', async ({ gameId }) => {
			console.log('[Socket] Received poker:ready_for_next_turn for game:', gameId);

			try {
				// Delegate to API route
				const response = await fetch(`http://localhost:${port}/api/socket/emit`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ signal: 'poker:ready_for_next_turn', gameId }),
				});

				if (!response.ok) {
					const errorText = await response.text();
					console.error('[Socket] API call failed:', errorText);
				} else {
					console.log('[Socket] Successfully processed ready_for_next_turn');
				}
			} catch (error) {
				console.error('[Socket] Error processing ready_for_next_turn:', error);
			}
		});

		// Handle poker bet action
		socket.on('poker:bet', async ({ gameId, chipCount }) => {
			console.log('[Socket] Received poker:bet for game:', gameId, 'user:', socket.userId, 'chips:', chipCount);

			try {
				// User must be registered first
				if (!socket.userId) {
					socket.emit('poker:bet_error', { error: 'Not authenticated - register first' });
					return;
				}

				// Delegate to API route which handles all the bet logic
				const response = await fetch(`http://localhost:${port}/api/socket/emit`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						signal: 'poker:bet',
						gameId,
						userId: socket.userId,
						chipCount
					}),
				});

				const result = await response.json();

				if (!response.ok) {
					console.error('[Socket] Bet failed:', result.error);
					socket.emit('poker:bet_error', { error: result.error });
				} else {
					console.log('[Socket] Successfully processed bet');
					socket.emit('poker:bet_success', { success: true });
				}
			} catch (error) {
				console.error('[Socket] Error processing bet:', error);
				socket.emit('poker:bet_error', { error: error.message || 'Failed to place bet' });
			}
		});

		// Handle poker fold action
		socket.on('poker:fold', async ({ gameId }) => {
			console.log('[Socket] Received poker:fold for game:', gameId, 'user:', socket.userId);

			try {
				// User must be registered first
				if (!socket.userId) {
					socket.emit('poker:fold_error', { error: 'Not authenticated - register first' });
					return;
				}

				// Delegate to API route which handles all the fold logic
				const response = await fetch(`http://localhost:${port}/api/socket/emit`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						signal: 'poker:fold',
						gameId,
						userId: socket.userId
					}),
				});

				const result = await response.json();

				if (!response.ok) {
					console.error('[Socket] Fold failed:', result.error);
					socket.emit('poker:fold_error', { error: result.error });
				} else {
					console.log('[Socket] Successfully processed fold');
					socket.emit('poker:fold_success', { success: true });
				}
			} catch (error) {
				console.error('[Socket] Error processing fold:', error);
				socket.emit('poker:fold_error', { error: error.message || 'Failed to fold' });
			}
		});

		// Handle poker timer action pre-selection
		socket.on('poker:set_timer_action', async ({ gameId, timerAction, betAmount }) => {
			console.log('[Socket] Received poker:set_timer_action for game:', gameId, 'user:', socket.userId, 'action:', timerAction);

			try {
				// User must be registered first
				if (!socket.userId) {
					socket.emit('poker:timer_error', { error: 'Not authenticated - register first' });
					return;
				}

				// Delegate to API route which handles all the timer logic
				const response = await fetch(`http://localhost:${port}/api/socket/emit`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						signal: 'poker:set_timer_action',
						gameId,
						userId: socket.userId,
						timerAction,
						betAmount
					}),
				});

				const result = await response.json();

				if (!response.ok) {
					console.error('[Socket] Set timer action failed:', result.error);
					socket.emit('poker:timer_error', { error: result.error });
				} else {
					console.log('[Socket] Successfully set timer action');
					socket.emit('poker:timer_success', { success: true });
				}
			} catch (error) {
				console.error('[Socket] Error setting timer action:', error);
				socket.emit('poker:timer_error', { error: error.message || 'Failed to set timer action' });
			}
		});

		// Handle poker player presence (away/present)
		socket.on('poker:set_presence', async ({ gameId, isAway }) => {
			console.log('[Socket] Received poker:set_presence for game:', gameId, 'user:', socket.userId, 'isAway:', isAway);

			try {
				// User must be registered first
				if (!socket.userId) {
					console.error('[Socket] Set presence failed - not authenticated');
					return;
				}

				// Delegate to API route which handles the presence logic
				const response = await fetch(`http://localhost:${port}/api/socket/emit`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						signal: 'poker:set_presence',
						gameId,
						userId: socket.userId,
						isAway
					}),
				});

				const result = await response.json();

				if (!response.ok) {
					console.error('[Socket] Set presence failed:', result.error);
				} else {
					console.log('[Socket] Successfully set presence to', isAway ? 'away' : 'present');
				}
			} catch (error) {
				console.error('[Socket] Error setting presence:', error);
			}
		});

		// Handle winner notification complete (client signals notification finished)
		socket.on('poker:winner_notification_complete', async ({ gameId }) => {
			console.log('[Socket] Received poker:winner_notification_complete for game:', gameId);

			try {
				// Delegate to API route which handles the reset logic
				const response = await fetch(`http://localhost:${port}/api/socket/emit`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						signal: 'poker:winner_notification_complete',
						gameId
					}),
				});

				if (!response.ok) {
					const result = await response.json();
					console.error('[Socket] Winner notification complete handler failed:', result.error);
				} else {
					console.log('[Socket] Successfully processed winner notification complete');
				}
			} catch (error) {
				console.error('[Socket] Error processing winner notification complete:', error);
			}
		});

		socket.on('disconnect', () => {
			if (socket.userId) {
				const userId = socket.userId
				const userSockets = onlineUsers.get(userId)

				if (userSockets) {
					userSockets.delete(socket.id)
					// If user has no more active connections, mark as offline
					if (userSockets.size === 0) {
						onlineUsers.delete(userId)
						// Broadcast that user is offline
						io.emit('user:offline', { userId })
					}
				}
			}
		})
	})

	httpServer
		.once('error', (err) => {
			console.error(err)
			process.exit(1)
		})
		.listen(port, () => {
			console.log(`> Ready on http://${hostname}:${port}`)
			console.log(`> Socket.IO server running on path: /api/socket/io`)
		})
})
