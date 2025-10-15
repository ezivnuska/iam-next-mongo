// app/ui/friendship-button.tsx

'use client'

import { useState, useEffect, useCallback } from 'react'
import FriendsMenu from '@/app/ui/friendship/friends-menu'
import Modal from '@/app/ui/modal'
import { getFriendshipStatus } from '@/app/lib/actions/friendships'
import { useFriendshipSocketEvents } from '@/app/lib/hooks/useFriendshipSocketEvents'
import { useFriendshipActions } from '@/app/lib/hooks/useFriendshipActions'
import { showError } from '@/app/lib/utils/error-handler'
import type { FriendshipStatusPayload, FriendRequestPayload } from '@/app/lib/socket/events'
import { Button } from '../button'

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
	const [pendingRequestsCount, setPendingRequestsCount] = useState(0)
	const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
	const { actionLoading, handleSendRequest, handleAcceptRequest, handleRejectRequest, handleRemoveFriend } = useFriendshipActions()

	// Load friendship status
	useEffect(() => {
		if (!isCurrentUser) {
			loadStatus()
		} else {
			setLoading(false)
		}
	}, [userId, isCurrentUser])

	// Socket event listeners
	useFriendshipSocketEvents({
		userId,
		friendshipId,
		isCurrentUser,
		onFriendRequestAccepted: (payload: FriendshipStatusPayload) => {
			setStatus('accepted')
			if (payload.friendshipId) {
				setFriendshipId(payload.friendshipId)
			}
		},
		onFriendshipEnded: () => {
			setStatus('none')
			setFriendshipId(undefined)
		},
		onFriendRequestSent: (payload: FriendRequestPayload) => {
			if (isCurrentUser) {
				setPendingRequestsCount(prev => prev + 1)
			} else if (payload.requester.id === userId) {
				setStatus('pending_received')
				setFriendshipId(payload.friendshipId)
			}
		},
	})

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

	const handleSend = async () => {
		try {
			const result = await handleSendRequest(userId)
			setStatus('pending_sent')
			setFriendshipId(result.friendshipId)
		} catch (error: any) {
			showError(error, 'Failed to send friend request')
		}
	}

	const handleAccept = async () => {
		if (!friendshipId) return
		try {
			await handleAcceptRequest(friendshipId)
			setStatus('accepted')
		} catch (error: any) {
			showError(error, 'Failed to accept friend request')
		}
	}

	const handleReject = async () => {
		if (!friendshipId) return
		try {
			await handleRejectRequest(friendshipId)
			setStatus('none')
			setFriendshipId(undefined)
		} catch (error: any) {
			showError(error, 'Failed to reject friend request')
		}
	}

	const handleCancel = async () => {
		if (!friendshipId) return
		try {
			await handleRemoveFriend(friendshipId)
			setStatus('none')
			setFriendshipId(undefined)
		} catch (error) {
			showError(error, 'Failed to cancel friend request')
		}
	}

	const handleRemove = async () => {
		if (!friendshipId) return
		try {
			await handleRemoveFriend(friendshipId)
			setStatus('none')
			setFriendshipId(undefined)
			setShowRemoveConfirm(false)
		} catch (error) {
			showError(error, 'Failed to remove friend')
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
				<Button
                    variant='secondary'
					onClick={() => setShowFriendsMenu(true)}
					// className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors relative"
				>
					My Friends
					{pendingRequestsCount > 0 && (
						<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
							{pendingRequestsCount}
						</span>
					)}
				</Button>

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
			<Button variant="secondary" disabled>
				Loading...
			</Button>
		)
	}

	if (status === 'none') {
		return (
			<Button
				onClick={handleSend}
				disabled={!!actionLoading}
				variant="default"
			>
				{actionLoading === 'send' ? 'Sending...' : 'Add Friend'}
			</Button>
		)
	}

	if (status === 'pending_sent') {
		return (
			<Button
				onClick={handleCancel}
				disabled={!!actionLoading}
				variant="secondary"
			>
				{actionLoading === 'remove' ? 'Canceling...' : 'Cancel Request'}
			</Button>
		)
	}

	if (status === 'pending_received') {
		return (
			<div className="flex gap-2">
				{actionLoading !== 'reject' && (
                    <Button
                        onClick={handleAccept}
                        disabled={!!actionLoading}
                        variant="confirm"
                    >
                        {actionLoading === 'accept' ? 'Accepting...' : 'Accept'}
                    </Button>
                )}
				{actionLoading !== 'accept' && (
                    <Button
                        onClick={handleReject}
                        disabled={!!actionLoading}
                        variant="secondary"
                    >
                        {actionLoading === 'reject' ? 'Declining...' : 'Decline'}
                    </Button>
                )}
			</div>
		)
	}

	if (status === 'accepted') {
		if (showRemoveConfirm) {
			return (
				<div className="flex gap-2">
					<Button
						onClick={handleRemove}
						disabled={!!actionLoading}
						variant="warn"
					>
						{actionLoading === 'remove' ? 'Removing...' : 'Remove'}
					</Button>
					{!actionLoading && (
						<Button
							onClick={() => setShowRemoveConfirm(false)}
							variant="secondary"
						>
							Cancel
						</Button>
					)}
				</div>
			)
		}

		return (
			<Button
				onClick={() => setShowRemoveConfirm(true)}
				variant="ghost"
			>
				✓ Friends
			</Button>
		)
	}

	return null
}
