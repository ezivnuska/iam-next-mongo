// app/lib/providers/socket-provider.tsx

'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { io as socketIO, Socket } from 'socket.io-client'
import { useUser } from '@/app/lib/providers/user-provider'
import { SOCKET_EVENTS } from '@/app/lib/socket/events'

interface SocketContextValue {
	socket: Socket | null
	isConnected: boolean
	onlineUsers: Set<string>
}

const SocketContext = createContext<SocketContextValue>({
	socket: null,
	isConnected: false,
	onlineUsers: new Set(),
})

export function useSocket() {
	return useContext(SocketContext)
}

export function SocketProvider({ children }: { children: ReactNode }) {
	const [socket, setSocket] = useState<Socket | null>(null)
	const [isConnected, setIsConnected] = useState(false)
	const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set())
	const { user } = useUser()

	useEffect(() => {
		const socketInstance = socketIO(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
			path: '/api/socket/io',
			transports: ['websocket', 'polling'],
			autoConnect: false,
		})

		socketInstance.on('connect', () => {
			setIsConnected(true)
		})

		socketInstance.on('disconnect', () => {
			setIsConnected(false)
		})

		socketInstance.on('connect_error', (error) => {
			console.error('Socket connection error:', error)
		})

		// Debug: Listen to ALL events
		// socketInstance.onAny((eventName, ...args) => {
		// 	console.log('**', eventName, 'with args:', args)
		// })

		// Listen for initial online users list
		socketInstance.on('users:online', ({ userIds }: { userIds: string[] }) => {
			setOnlineUsers(new Set(userIds))
		})

		// Listen for user online/offline events
		socketInstance.on(SOCKET_EVENTS.USER_ONLINE, ({ userId }: { userId: string }) => {
			setOnlineUsers((prev) => {
				const newSet = new Set(prev)
				newSet.add(userId)
				return newSet
			})
		})

		socketInstance.on(SOCKET_EVENTS.USER_OFFLINE, ({ userId }: { userId: string }) => {
			setOnlineUsers((prev) => {
				const next = new Set(prev)
				next.delete(userId)
				return next
			})
		})

		setSocket(socketInstance)

		socketInstance.connect()

		return () => {
			socketInstance.disconnect()
		}
	}, [])

	// Register/re-register user when user changes (including when guest user is created)
	useEffect(() => {
		if (!socket || !isConnected) return

		if (user?.id) {
			socket.emit('register', user.id)
		}
	}, [user?.id, socket, isConnected])

	return (
		<SocketContext.Provider value={{ socket, isConnected, onlineUsers }}>
			{children}
		</SocketContext.Provider>
	)
}
