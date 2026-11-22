// server.ts
// Custom Next.js server with Socket.IO and Hono mobile API support.
// Run via: tsx server.ts

import { config } from 'dotenv'
import { expand } from 'dotenv-expand'
import path from 'path'

// Load env before any module that reads process.env at initialisation time.
const envFile = process.env.NODE_ENV === 'production' ? '.env.production' : '.env.development'
expand(config({ path: path.resolve(process.cwd(), envFile) }))
config({ path: path.resolve(process.cwd(), '.env') })
if (process.env.NODE_ENV !== 'production') {
  config({ path: path.resolve(process.cwd(), '.env.local'), override: true })
}
// Staging overrides: loaded last so .env.staging values beat .env.production.
// APP_ENV=staging is set by ecosystem.staging.config.js.
if (process.env.APP_ENV === 'staging') {
  config({ path: path.resolve(process.cwd(), '.env.staging'), override: true })
}

import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server, Socket } from 'socket.io'
import { getRequestListener } from '@hono/node-server'
import honoApp from './api/app'
import { verifyMobileToken, getGamesSecret } from './app/lib/jwt'
import { jwtVerify } from 'jose'
import { isValidObjectId } from '@iam/shared-types'

interface SocketData {
  userId: string
  username?: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AppSocket = Socket<Record<string, any>, Record<string, any>, Record<string, any>, SocketData>

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
			const parsedUrl = parse(req.url ?? '/', true)
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

	// Expose io to Next.js API routes and Hono routes (same process)
	global.io = io

	const internalHeaders: Record<string, string> = {
		'Content-Type': 'application/json',
		'x-internal-secret': process.env.INTERNAL_SECRET ?? '',
	}

	// Track online users
	const onlineUsers = new Map<string, Set<string>>()
	const onlineUsernames = new Map<string, string>()

	let staleGameCheckInterval: ReturnType<typeof setInterval> | null = null

	function startStaleGameCheck() {
		if (!staleGameCheckInterval) {
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

	io.on('connection', (socket: AppSocket) => {
		socket.on('register', async (data: unknown) => {
			if (!data || typeof data !== 'object') return
			const { userId, token, username } = data as Record<string, string | undefined>
			if (!userId) return

			if (userId.startsWith('guest-')) {
				// Guests are ephemeral; limit their ID format to prevent spoofing real user IDs.
				if (!/^guest-[a-zA-Z0-9_-]{8,64}$/.test(userId)) return
			} else {
				// Non-guest users must have a valid MongoDB ObjectId and a verified JWT.
				// Web clients send a games SSO token (GAMES_TOKEN_SECRET); mobile clients
				// send a mobile token (NEXTAUTH_SECRET). Try games token first.
				if (!isValidObjectId(userId)) return
				if (!token) return
				try {
					const { payload } = await jwtVerify(token, getGamesSecret())
					if (payload.id !== userId) return
				} catch {
					try {
						const payload = await verifyMobileToken(token)
						if (payload.id !== userId) return
					} catch {
						return
					}
				}
			}

			socket.data.userId = userId
			socket.data.username = username
			socket.join(`user:${userId}`)

			const isNewUser = !onlineUsers.has(userId)
			if (isNewUser) {
				onlineUsers.set(userId, new Set())
			}
			onlineUsers.get(userId)!.add(socket.id)
			onlineUsernames.set(userId, username || userId)

			setImmediate(() => {
				const onlineList = Array.from(onlineUsers.keys()).map(id => ({
					id,
					username: onlineUsernames.get(id) || id,
				}))
				socket.emit('users:online', { users: onlineList })

				if (isNewUser) {
					socket.broadcast.emit('user:online', { userId, username: username || userId })
				}
			})

			// Notify game server of reconnection so it can resume any pending turn
			try {
				await fetch(`http://localhost:${port}/api/socket/emit`, {
					method: 'POST',
					headers: internalHeaders,
					body: JSON.stringify({ signal: 'poker:player_reconnected', userId, username }),
				})
			} catch {
				// Silently fail
			}
		})

		// --- Social platform room events ---

		socket.on('issue:join', ({ issueId }: { issueId?: string }) => {
			if (issueId) socket.join(`issue:${issueId}`)
		})

		socket.on('issue:leave', ({ issueId }: { issueId?: string }) => {
			if (issueId) socket.leave(`issue:${issueId}`)
		})

		// --- Poker game events ---

		socket.on('poker:join_game', async ({ gameId, username }: { gameId: string; username?: string }) => {
			try {
				if (!socket.data.userId) { socket.emit('poker:join_error', { error: 'Not authenticated' }); return }
				const res = await fetch(`http://localhost:${port}/api/socket/emit`, {
					method: 'POST', headers: internalHeaders,
					body: JSON.stringify({ signal: 'poker:join_game', gameId, userId: socket.data.userId, username: username || 'Guest' }),
				})
				const result = await res.json()
				if (!res.ok) socket.emit('poker:join_error', { error: result.error })
				else socket.emit('poker:join_success', { gameState: result.gameState, userId: result.userId, username: result.username })
			} catch (err) {
				socket.emit('poker:join_error', { error: err instanceof Error ? err.message : 'Failed to join' })
			}
		})

		socket.on('poker:leave_game', async ({ gameId }: { gameId: string }) => {
			try {
				if (!socket.data.userId) { socket.emit('poker:leave_error', { error: 'Not authenticated' }); return }
				const res = await fetch(`http://localhost:${port}/api/socket/emit`, {
					method: 'POST', headers: internalHeaders,
					body: JSON.stringify({ signal: 'poker:leave_game', gameId, userId: socket.data.userId }),
				})
				const result = await res.json()
				if (!res.ok) socket.emit('poker:leave_error', { error: result.error })
				else socket.emit('poker:leave_success', { gameState: result.gameState })
			} catch (err) {
				socket.emit('poker:leave_error', { error: err instanceof Error ? err.message : 'Failed to leave' })
			}
		})

		socket.on('poker:ready_for_next_turn', async ({ gameId }: { gameId: string }) => {
			try {
				await fetch(`http://localhost:${port}/api/socket/emit`, {
					method: 'POST', headers: internalHeaders,
					body: JSON.stringify({ signal: 'poker:ready_for_next_turn', gameId }),
				})
			} catch { /* Silently fail */ }
		})

		socket.on('poker:bet', async ({ gameId, chipCount }: { gameId: string; chipCount: number }) => {
			try {
				if (!socket.data.userId) { socket.emit('poker:bet_error', { error: 'Not authenticated' }); return }
				const res = await fetch(`http://localhost:${port}/api/socket/emit`, {
					method: 'POST', headers: internalHeaders,
					body: JSON.stringify({ signal: 'poker:bet', gameId, userId: socket.data.userId, chipCount }),
				})
				const result = await res.json()
				if (!res.ok) socket.emit('poker:bet_error', { error: result.error })
				else socket.emit('poker:bet_success', { success: true })
			} catch (err) {
				socket.emit('poker:bet_error', { error: err instanceof Error ? err.message : 'Failed to bet' })
			}
		})

		socket.on('poker:fold', async ({ gameId }: { gameId: string }) => {
			try {
				if (!socket.data.userId) { socket.emit('poker:fold_error', { error: 'Not authenticated' }); return }
				const res = await fetch(`http://localhost:${port}/api/socket/emit`, {
					method: 'POST', headers: internalHeaders,
					body: JSON.stringify({ signal: 'poker:fold', gameId, userId: socket.data.userId }),
				})
				const result = await res.json()
				if (!res.ok) socket.emit('poker:fold_error', { error: result.error })
				else socket.emit('poker:fold_success', { success: true })
			} catch (err) {
				socket.emit('poker:fold_error', { error: err instanceof Error ? err.message : 'Failed to fold' })
			}
		})

		socket.on('poker:set_timer_action', async ({ gameId, timerAction, betAmount }: { gameId: string; timerAction: string; betAmount?: number }) => {
			try {
				if (!socket.data.userId) { socket.emit('poker:timer_error', { error: 'Not authenticated' }); return }
				const res = await fetch(`http://localhost:${port}/api/socket/emit`, {
					method: 'POST', headers: internalHeaders,
					body: JSON.stringify({ signal: 'poker:set_timer_action', gameId, userId: socket.data.userId, timerAction, betAmount }),
				})
				const result = await res.json()
				if (!res.ok) socket.emit('poker:timer_error', { error: result.error })
				else socket.emit('poker:timer_success', { success: true })
			} catch (err) {
				socket.emit('poker:timer_error', { error: err instanceof Error ? err.message : 'Failed to set timer action' })
			}
		})

		socket.on('poker:set_presence', async ({ gameId, isAway }: { gameId: string; isAway: boolean }) => {
			try {
				if (!socket.data.userId) return
				await fetch(`http://localhost:${port}/api/socket/emit`, {
					method: 'POST', headers: internalHeaders,
					body: JSON.stringify({ signal: 'poker:set_presence', gameId, userId: socket.data.userId, isAway }),
				})
			} catch { /* Silently fail */ }
		})

		socket.on('poker:winner_notification_complete', async ({ gameId }: { gameId: string }) => {
			try {
				await fetch(`http://localhost:${port}/api/socket/emit`, {
					method: 'POST', headers: internalHeaders,
					body: JSON.stringify({ signal: 'poker:winner_notification_complete', gameId }),
				})
			} catch { /* Silently fail */ }
		})

		// TODO: registerWordDuelHandlers(io, socket) — add once word-duel is moved here

		socket.on('disconnect', () => {
			if (socket.data.userId) {
				const userId = socket.data.userId
				const userSockets = onlineUsers.get(userId)

				if (userSockets) {
					userSockets.delete(socket.id)
					if (userSockets.size === 0) {
						onlineUsers.delete(userId)
						onlineUsernames.delete(userId)
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
			startStaleGameCheck()
		})
})
