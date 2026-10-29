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
if (process.env.NODE_ENV !== 'production') {
  config({ path: path.resolve(process.cwd(), '.env.local'), override: true })
}

import { createServer } from 'http'
import { parse } from 'url'
import next from 'next'
import { Server, Socket } from 'socket.io'
import { jwtVerify } from 'jose'
import { getRequestListener } from '@hono/node-server'
import honoApp from './api/app'

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

	// Expose io to Hono routes via global (same process, no HTTP bridge needed)
	global.io = io

	const getJwtSecret = () => {
		if (!process.env.NEXTAUTH_SECRET) throw new Error('NEXTAUTH_SECRET is not set')
		return new TextEncoder().encode(process.env.NEXTAUTH_SECRET)
	}

	// Track online users
	const onlineUsers = new Map<string, Set<string>>()
	const onlineUsernames = new Map<string, string>()

	io.on('connection', (socket: AppSocket) => {
		socket.on('register', async (data: unknown) => {
			if (!data || typeof data !== 'object') return
			const { userId, token, username } = data as Record<string, string | undefined>
			if (!userId) return

			if (!userId.startsWith('guest-')) {
				if (!token) return
				try {
					const { payload } = await jwtVerify(token, getJwtSecret())
					if (payload.id !== userId) return
				} catch {
					return
				}
			}

			if (userId) {
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
			}
		})

		socket.on('issue:join', ({ issueId }: { issueId?: string }) => {
			if (issueId) socket.join(`issue:${issueId}`)
		})

		socket.on('issue:leave', ({ issueId }: { issueId?: string }) => {
			if (issueId) socket.leave(`issue:${issueId}`)
		})

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
		})
})
