// app/lib/providers/socket-provider.tsx

'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react'
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

	// Use ref to track current user for event handlers without triggering socket reconnection
	const userRef = useRef(user)

	// Update ref when user changes
	useEffect(() => {
		userRef.current = user
	}, [user])

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

		// Listen for poker player removal (to clear guest credentials when away player is auto-removed)
		// This listener stays active even when user navigates away from poker page
		socketInstance.on(SOCKET_EVENTS.POKER_PLAYER_LEFT, (payload: { playerId: string; players: any[]; playerCount: number; gameReset?: boolean; actionHistory: any[] }) => {
			// Use ref to get current user without causing socket reconnection
			const currentUser = userRef.current
			if (!currentUser?.isGuest) return

			// If the removed player is the current guest user, clear their credentials
			if (payload.playerId === currentUser.id) {
				try {
					localStorage.removeItem('poker_guest_id')
					localStorage.removeItem('poker_guest_username')
					localStorage.removeItem('poker_guest_created_at')
				} catch (e) {
					console.warn('Failed to clear guest credentials on auto-removal:', e)
				}
			}
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
			// For guest users, include username in registration for reconnection matching
			const registrationData = user.isGuest && user.username
				? { userId: user.id, username: user.username }
				: user.id;

			socket.emit('register', registrationData)
		}
	}, [user?.id, user?.username, user?.isGuest, socket, isConnected])

	return (
		<SocketContext.Provider value={{ socket, isConnected, onlineUsers }}>
			{children}
		</SocketContext.Provider>
	)
}
