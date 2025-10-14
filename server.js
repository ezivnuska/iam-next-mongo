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
		socket.on('register', (userId) => {
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
			}
		})

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
