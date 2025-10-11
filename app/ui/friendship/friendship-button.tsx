// app/ui/friendship-button.tsx

'use client'

import { useState, useEffect, useCallback } from 'react'
import FriendsMenu from '@/app/ui/friendship/friends-menu'
import Modal from '@/app/ui/modal'
import { useSocket } from '@/app/lib/providers/socket-provider'
import { SOCKET_EVENTS } from '@/app/lib/socket/events'
import type { FriendshipStatusPayload, FriendRequestPayload } from '@/app/lib/socket/events'
import { sendFriendRequest, removeFriend, getFriendshipStatus, acceptFriendRequest, rejectFriendRequest } from '@/app/lib/actions/friendships'

type FriendshipButtonProps = {
	userId: string
	username: string
	isCurrentUser?: boolean
}

export default function FriendshipButton({ userId, username, isCurrentUser }: FriendshipButtonProps) {
	const [showFriendsMenu, setShowFriendsMenu] = useState(false)
	const [status, setStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'accepted'>('none')
	const [friendshipId, setFriendshipId] = useState<string | undefined>()
	const [loading, setLoading] = useState(true)
	const [actionLoading, setActionLoading] = useState(false)
	const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
	const { socket } = useSocket()

	// Load friendship status
	useEffect(() => {
		if (!isCurrentUser) {
			loadStatus()
		} else {
			setLoading(false)
		}
	}, [userId, isCurrentUser])

	// Socket event listeners - consolidated from both components
	useEffect(() => {
		if (!socket) return

		// Handle friend request accepted (for AddFriendButton)
		const handleFriendRequestAccepted = (payload: FriendshipStatusPayload) => {
			if (payload.otherUserId === userId || payload.friendshipId === friendshipId) {
				setStatus('accepted')
				if (payload.friendshipId) {
					setFriendshipId(payload.friendshipId)
				}
			}
		}

		// Handle friendship ended (rejected or removed)
		const handleFriendshipEnded = (payload: FriendshipStatusPayload) => {
			if (payload.otherUserId === userId || payload.friendshipId === friendshipId) {
				setStatus('none')
				setFriendshipId(undefined)
			}
		}

		// Handle friend request sent (for FriendsMenu badge count)
		const handleFriendRequestSent = (payload: FriendRequestPayload) => {
			if (isCurrentUser) {
				// If viewing own profile, increment badge
				setPendingRequestsCount(prev => prev + 1)
			} else if (payload.requester.id === userId) {
				// If viewing the sender's profile, update button to show "Accept Request"
				setStatus('pending_received')
				setFriendshipId(payload.friendshipId)
			}
		}

		socket.on(SOCKET_EVENTS.FRIEND_REQUEST_ACCEPTED, handleFriendRequestAccepted)
		socket.on(SOCKET_EVENTS.FRIEND_REQUEST_REJECTED, handleFriendshipEnded)
		socket.on(SOCKET_EVENTS.FRIENDSHIP_REMOVED, handleFriendshipEnded)
		socket.on(SOCKET_EVENTS.FRIEND_REQUEST_SENT, handleFriendRequestSent)

		return () => {
			socket.off(SOCKET_EVENTS.FRIEND_REQUEST_ACCEPTED, handleFriendRequestAccepted)
			socket.off(SOCKET_EVENTS.FRIEND_REQUEST_REJECTED, handleFriendshipEnded)
			socket.off(SOCKET_EVENTS.FRIENDSHIP_REMOVED, handleFriendshipEnded)
			socket.off(SOCKET_EVENTS.FRIEND_REQUEST_SENT, handleFriendRequestSent)
		}
	}, [socket, userId, friendshipId, isCurrentUser])

	const loadStatus = async () => {
		setLoading(true)
		try {
			const result = await getFriendshipStatus(userId)
			setStatus(result.status)
			setFriendshipId(result.friendshipId)
		} catch (error) {
			console.error('Failed to load friendship status:', error)
		} finally {
			setLoading(false)
		}
	}

	const handleSendRequest = async () => {
		setActionLoading(true)
		try {
			const result = await sendFriendRequest(userId)
			setStatus('pending_sent')
			setFriendshipId(result.friendshipId)
		} catch (error: any) {
			console.error('Failed to send friend request:', error)
			alert(error.message || 'Failed to send friend request')
		} finally {
			setActionLoading(false)
		}
	}

	const handleAcceptRequest = async () => {
		if (!friendshipId) return

		setActionLoading(true)
		try {
			await acceptFriendRequest(friendshipId)
			setStatus('accepted')
		} catch (error: any) {
			console.error('Failed to accept friend request:', error)
			alert(error.message || 'Failed to accept friend request')
		} finally {
			setActionLoading(false)
		}
	}

	const handleRejectRequest = async () => {
		if (!friendshipId) return

		setActionLoading(true)
		try {
			await rejectFriendRequest(friendshipId)
			setStatus('none')
			setFriendshipId(undefined)
		} catch (error: any) {
			console.error('Failed to reject friend request:', error)
			alert(error.message || 'Failed to reject friend request')
		} finally {
			setActionLoading(false)
		}
	}

	const handleCancelRequest = async () => {
		await handleFriendshipAction(
			() => removeFriend(friendshipId!),
			'Failed to cancel friend request'
		)
	}

	const handleRemoveFriend = async () => {
		if (!confirm(`Remove ${username} from friends?`)) return
		await handleFriendshipAction(
			() => removeFriend(friendshipId!),
			'Failed to remove friend'
		)
	}

	// Shared handler for actions that reset friendship status
	const handleFriendshipAction = async (
		action: () => Promise<any>,
		errorMessage: string
	) => {
		if (!friendshipId) return

		setActionLoading(true)
		try {
			await action()
			setStatus('none')
			setFriendshipId(undefined)
		} catch (error) {
			console.error(errorMessage, error)
			alert(errorMessage)
		} finally {
			setActionLoading(false)
		}
	}

	const handleMenuClose = useCallback(() => {
		setShowFriendsMenu(false)
		setPendingRequestsCount(0) // Reset count when menu is closed
	}, [])

	// If it's the current user, show a button to open their friends menu
	if (isCurrentUser) {
		return (
			<>
				<button
					onClick={() => setShowFriendsMenu(true)}
					className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors relative"
				>
					My Friends
					{pendingRequestsCount > 0 && (
						<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
							{pendingRequestsCount}
						</span>
					)}
				</button>

				{showFriendsMenu && (
					<Modal
						onClose={handleMenuClose}
						contentClassName="bg-white rounded-lg p-0 max-w-md w-full"
					>
						<FriendsMenu onUpdate={handleMenuClose} />
					</Modal>
				)}
			</>
		)
	}

	// Otherwise, show the add friend button with different states
	if (loading) {
		return (
			<button className="px-4 py-2 bg-gray-200 text-gray-500 rounded-lg" disabled>
				Loading...
			</button>
		)
	}

	if (status === 'none') {
		return (
			<button
				onClick={handleSendRequest}
				disabled={actionLoading}
				className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
			>
				{actionLoading ? 'Sending...' : 'Add Friend'}
			</button>
		)
	}

	if (status === 'pending_sent') {
		return (
			<button
				onClick={handleCancelRequest}
				disabled={actionLoading}
				className="px-4 py-2 bg-gray-300 text-gray-600 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-50"
			>
				{actionLoading ? 'Canceling...' : 'Cancel Request'}
			</button>
		)
	}

	if (status === 'pending_received') {
		return (
			<div className="flex gap-2">
				<button
					onClick={handleAcceptRequest}
					disabled={actionLoading}
					className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
				>
					{actionLoading ? 'Accepting...' : 'Accept'}
				</button>
				<button
					onClick={handleRejectRequest}
					disabled={actionLoading}
					className="px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-red-100 hover:text-red-600 transition-colors disabled:opacity-50"
				>
					{actionLoading ? 'Declining...' : 'Decline'}
				</button>
			</div>
		)
	}

	if (status === 'accepted') {
		return (
			<button
				onClick={handleRemoveFriend}
				disabled={actionLoading}
				className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-red-600 transition-colors disabled:opacity-50"
			>
				{actionLoading ? 'Removing...' : '✓ Friends'}
			</button>
		)
	}

	return null
}
