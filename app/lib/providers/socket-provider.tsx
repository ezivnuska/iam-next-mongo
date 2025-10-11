// app/lib/providers/socket-provider.tsx

'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { io as socketIO, Socket } from 'socket.io-client'
import { useUser } from '@/app/lib/providers/user-provider'
import { SOCKET_EVENTS } from '@/app/lib/socket/events'

interface SocketContextValue {
	socket: Socket | null
	isConnected: boolean
}

const SocketContext = createContext<SocketContextValue>({
	socket: null,
	isConnected: false,
})

export function useSocket() {
	return useContext(SocketContext)
}

export function SocketProvider({ children }: { children: ReactNode }) {
	const [socket, setSocket] = useState<Socket | null>(null)
	const [isConnected, setIsConnected] = useState(false)
	const { user } = useUser()

	useEffect(() => {
		const socketInstance = socketIO(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000', {
			path: '/api/socket/io',
			transports: ['websocket', 'polling'],
		})

		socketInstance.on('connect', () => {
			setIsConnected(true)

			if (user?.id) {
				socketInstance.emit('register', user.id)
			}
		})

		socketInstance.on('disconnect', () => {
			setIsConnected(false)
		})

		socketInstance.on('connect_error', (error) => {
			console.error('Socket connection error:', error)
		})

		setSocket(socketInstance)

		return () => {
			socketInstance.disconnect()
		}
	}, [user?.id])

	return (
		<SocketContext.Provider value={{ socket, isConnected }}>
			{children}
		</SocketContext.Provider>
	)
}
