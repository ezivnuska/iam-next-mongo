// @ts-nocheck
// server.ts
// Custom Next.js server with Socket.IO and Hono mobile API support.
// Replaces server.js — run via: tsx server.ts

import { config } from 'dotenv'
import { expand } from 'dotenv-expand'
import path from 'path'

// Load env before any module that reads process.env at initialisation time.
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
expand(config({ path: path.resolve(process.cwd(), envFile) }))
config({ path: path.resolve(process.cwd(), '.env') })

import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server } from 'socket.io'
import { getRequestListener } from '@hono/node-server'
import honoApp from './api/app'

const dev = process.env.NODE_ENV !== 'production'
const hostname = 'localhost'
const port = parseInt(process.env.PORT || '3000', 10)

const app = next({ dev, hostname, port })
const handle = app.getRequestHandler()
const honoHandler = getRequestListener(honoApp.fetch)

app.prepare().then(() => {
	const httpServer = createServer(async (req, res) => {
		try {
			if (req.url?.startsWith('/api/mobile/')) {
				return await honoHandler(req, res)
			}
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

	// Expose io to Hono routes via global (same process, no HTTP bridge needed)
	global.io = io

	const internalHeaders = {
		'Content-Type': 'application/json',
		'x-internal-secret': process.env.INTERNAL_SECRET,
	}

	// Track online users
	const onlineUsers = new Map() // Map<userId, Set<socketId>>

	let staleGameCheckInterval = null

	function startStaleGameCheck() {
		if (!staleGameCheckInterval) {
			console.log('[Stale Check] Starting continuous health check')
			staleGameCheckInterval = setInterval(async () => {
				try {
					await fetch(`http://localhost:${port}/api/poker/check-stale`, {
						method: 'POST',
						headers: internalHeaders,
					})
				} catch {
					// Silently fail
				}
			}, 30000)
		}
	}

	io.on('connection', (socket) => {
		socket.on('register', async (data) => {
			const userId = typeof data === 'string' ? data : data?.userId
			const username = typeof data === 'object' ? data?.username : undefined

			if (userId) {
				socket.join(`user:${userId}`)
				socket.userId = userId
				socket.username = username

				const isNewUser = !onlineUsers.has(userId)
				if (isNewUser) {
					onlineUsers.set(userId, new Set())
				}
				onlineUsers.get(userId).add(socket.id)

				setImmediate(() => {
					const currentOnlineUsers = Array.from(onlineUsers.keys())
					socket.emit('users:online', { userIds: currentOnlineUsers })

					if (isNewUser) {
						socket.broadcast.emit('user:online', { userId })
					}
				})

				try {
					const response = await fetch(`http://localhost:${port}/api/socket/emit`, {
						method: 'POST',
						headers: internalHeaders,
						body: JSON.stringify({
							signal: 'poker:player_reconnected',
							userId,
							username,
						}),
					})
					if (!response.ok) {
						console.log('[Socket] Player reconnection check completed (no active game)')
					}
				} catch (error) {
					console.error('[Socket] Error checking poker game on reconnect:', error.message)
				}
			}
		})

		socket.on('poker:join_game', async ({ gameId, username }) => {
			console.log('[Socket] Received poker:join_game for game:', gameId, 'user:', socket.userId)
			try {
				if (!socket.userId) {
					socket.emit('poker:join_error', { error: 'Not authenticated - register first' })
					return
				}
				const response = await fetch(`http://localhost:${port}/api/socket/emit`, {
					method: 'POST',
					headers: internalHeaders,
					body: JSON.stringify({
						signal: 'poker:join_game',
						gameId,
						userId: socket.userId,
						username: username || 'Guest',
					}),
				})
				const result = await response.json()
				if (!response.ok) {
					console.error('[Socket] Join failed:', result.error)
					socket.emit('poker:join_error', { error: result.error })
				} else {
					socket.emit('poker:join_success', {
						gameState: result.gameState,
						userId: result.userId,
						username: result.username,
					})
				}
			} catch (error) {
				console.error('[Socket] Error processing join_game:', error)
				socket.emit('poker:join_error', { error: error.message || 'Failed to join game' })
			}
		})

		socket.on('poker:leave_game', async ({ gameId }) => {
			console.log('[Socket] Received poker:leave_game for game:', gameId, 'user:', socket.userId)
			try {
				if (!socket.userId) {
					socket.emit('poker:leave_error', { error: 'Not authenticated - register first' })
					return
				}
				const response = await fetch(`http://localhost:${port}/api/socket/emit`, {
					method: 'POST',
					headers: internalHeaders,
					body: JSON.stringify({ signal: 'poker:leave_game', gameId, userId: socket.userId }),
				})
				const result = await response.json()
				if (!response.ok) {
					console.error('[Socket] Leave failed:', result.error)
					socket.emit('poker:leave_error', { error: result.error })
				} else {
					socket.emit('poker:leave_success', { gameState: result.gameState })
				}
			} catch (error) {
				console.error('[Socket] Error processing leave_game:', error)
				socket.emit('poker:leave_error', { error: error.message || 'Failed to leave game' })
			}
		})

		socket.on('poker:ready_for_next_turn', async ({ gameId }) => {
			console.log('[Socket] Received poker:ready_for_next_turn for game:', gameId)
			try {
				const response = await fetch(`http://localhost:${port}/api/socket/emit`, {
					method: 'POST',
					headers: internalHeaders,
					body: JSON.stringify({ signal: 'poker:ready_for_next_turn', gameId }),
				})
				if (!response.ok) {
					console.error('[Socket] API call failed:', await response.text())
				}
			} catch (error) {
				console.error('[Socket] Error processing ready_for_next_turn:', error)
			}
		})

		socket.on('poker:bet', async ({ gameId, chipCount }) => {
			console.log('[Socket] Received poker:bet for game:', gameId, 'user:', socket.userId, 'chips:', chipCount)
			try {
				if (!socket.userId) {
					socket.emit('poker:bet_error', { error: 'Not authenticated - register first' })
					return
				}
				const response = await fetch(`http://localhost:${port}/api/socket/emit`, {
					method: 'POST',
					headers: internalHeaders,
					body: JSON.stringify({ signal: 'poker:bet', gameId, userId: socket.userId, chipCount }),
				})
				const result = await response.json()
				if (!response.ok) {
					console.error('[Socket] Bet failed:', result.error)
					socket.emit('poker:bet_error', { error: result.error })
				} else {
					socket.emit('poker:bet_success', { success: true })
				}
			} catch (error) {
				console.error('[Socket] Error processing bet:', error)
				socket.emit('poker:bet_error', { error: error.message || 'Failed to place bet' })
			}
		})

		socket.on('poker:fold', async ({ gameId }) => {
			console.log('[Socket] Received poker:fold for game:', gameId, 'user:', socket.userId)
			try {
				if (!socket.userId) {
					socket.emit('poker:fold_error', { error: 'Not authenticated - register first' })
					return
				}
				const response = await fetch(`http://localhost:${port}/api/socket/emit`, {
					method: 'POST',
					headers: internalHeaders,
					body: JSON.stringify({ signal: 'poker:fold', gameId, userId: socket.userId }),
				})
				const result = await response.json()
				if (!response.ok) {
					console.error('[Socket] Fold failed:', result.error)
					socket.emit('poker:fold_error', { error: result.error })
				} else {
					socket.emit('poker:fold_success', { success: true })
				}
			} catch (error) {
				console.error('[Socket] Error processing fold:', error)
				socket.emit('poker:fold_error', { error: error.message || 'Failed to fold' })
			}
		})

		socket.on('poker:set_timer_action', async ({ gameId, timerAction, betAmount }) => {
			console.log('[Socket] Received poker:set_timer_action for game:', gameId, 'user:', socket.userId, 'action:', timerAction)
			try {
				if (!socket.userId) {
					socket.emit('poker:timer_error', { error: 'Not authenticated - register first' })
					return
				}
				const response = await fetch(`http://localhost:${port}/api/socket/emit`, {
					method: 'POST',
					headers: internalHeaders,
					body: JSON.stringify({
						signal: 'poker:set_timer_action',
						gameId,
						userId: socket.userId,
						timerAction,
						betAmount,
					}),
				})
				const result = await response.json()
				if (!response.ok) {
					console.error('[Socket] Set timer action failed:', result.error)
					socket.emit('poker:timer_error', { error: result.error })
				} else {
					socket.emit('poker:timer_success', { success: true })
				}
			} catch (error) {
				console.error('[Socket] Error setting timer action:', error)
				socket.emit('poker:timer_error', { error: error.message || 'Failed to set timer action' })
			}
		})

		socket.on('poker:set_presence', async ({ gameId, isAway }) => {
			console.log('[Socket] Received poker:set_presence for game:', gameId, 'user:', socket.userId, 'isAway:', isAway)
			try {
				if (!socket.userId) {
					console.error('[Socket] Set presence failed - not authenticated')
					return
				}
				const response = await fetch(`http://localhost:${port}/api/socket/emit`, {
					method: 'POST',
					headers: internalHeaders,
					body: JSON.stringify({
						signal: 'poker:set_presence',
						gameId,
						userId: socket.userId,
						isAway,
					}),
				})
				const result = await response.json()
				if (!response.ok) {
					console.error('[Socket] Set presence failed:', result.error)
				}
			} catch (error) {
				console.error('[Socket] Error setting presence:', error)
			}
		})

		socket.on('poker:winner_notification_complete', async ({ gameId }) => {
			console.log('[Socket] Received poker:winner_notification_complete for game:', gameId)
			try {
				const response = await fetch(`http://localhost:${port}/api/socket/emit`, {
					method: 'POST',
					headers: internalHeaders,
					body: JSON.stringify({ signal: 'poker:winner_notification_complete', gameId }),
				})
				if (!response.ok) {
					const result = await response.json()
					console.error('[Socket] Winner notification complete handler failed:', result.error)
				}
			} catch (error) {
				console.error('[Socket] Error processing winner notification complete:', error)
			}
		})

		socket.on('issue:join', ({ issueId }) => {
			if (issueId) socket.join(`issue:${issueId}`)
		})

		socket.on('issue:leave', ({ issueId }) => {
			if (issueId) socket.leave(`issue:${issueId}`)
		})

		socket.on('disconnect', () => {
			if (socket.userId) {
				const userId = socket.userId
				const userSockets = onlineUsers.get(userId)

				if (userSockets) {
					userSockets.delete(socket.id)
					if (userSockets.size === 0) {
						onlineUsers.delete(userId)
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
		.listen(port, hostname, () => {
			console.log(`> Ready on http://${hostname}:${port}`)
			console.log(`> Socket.IO server running on path: /api/socket/io`)
			console.log(`> Mobile API handled by Hono at /api/mobile/**`)
			console.log(`> Stale game health check: Continuous (runs every 30 seconds)`)

			startStaleGameCheck()
		})
})
