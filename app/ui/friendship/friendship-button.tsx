// app/ui/friendship-button.tsx

'use client'

import { useState, useEffect } from 'react'
import { getFriendshipStatus } from '@/app/lib/actions/friendships'
import { useFriendshipSocketEvents } from '@/app/lib/hooks/useFriendshipSocketEvents'
import { useFriendshipActions } from '@/app/lib/hooks/useFriendshipActions'
import { showError } from '@/app/lib/utils/error-handler'
import type { FriendshipStatusPayload, FriendRequestPayload } from '@/app/lib/socket/events'
import { Button } from '@iam/ui'

type FriendshipButtonProps = {
	userId: string
	username: string
}

export default function FriendshipButton({ userId, username }: FriendshipButtonProps) {
	const [status, setStatus] = useState<'none' | 'pending_sent' | 'pending_received' | 'accepted'>('none')
	const [friendshipId, setFriendshipId] = useState<string | undefined>()
	const [loading, setLoading] = useState(true)
	const [showRemoveConfirm, setShowRemoveConfirm] = useState(false)
	const { actionLoading, handleSendRequest, handleAcceptRequest, handleRejectRequest, handleRemoveFriend } = useFriendshipActions()

	useEffect(() => {
		loadStatus()
	}, [userId])

	useFriendshipSocketEvents({
		userId,
		friendshipId,
		onFriendRequestAccepted: (payload: FriendshipStatusPayload) => {
			setStatus('accepted')
			if (payload.friendshipId) setFriendshipId(payload.friendshipId)
		},
		onFriendshipEnded: () => {
			setStatus('none')
			setFriendshipId(undefined)
		},
		onFriendRequestSent: (payload: FriendRequestPayload) => {
			if (payload.requester.id === userId) {
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
		} catch (error) {
			showError(error, 'Failed to send friend request')
		}
	}

	const handleAccept = async () => {
		if (!friendshipId) return
		try {
			await handleAcceptRequest(friendshipId)
			setStatus('accepted')
		} catch (error) {
			showError(error, 'Failed to accept friend request')
		}
	}

	const handleReject = async () => {
		if (!friendshipId) return
		try {
			await handleRejectRequest(friendshipId)
			setStatus('none')
			setFriendshipId(undefined)
		} catch (error) {
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

	if (loading) return <span className='text-gray-400 lading-none px-2'>. . .</span>

	if (status === 'none') {
		return (
			<Button onClick={handleSend} disabled={!!actionLoading} variant='default'>
				{actionLoading === 'send' ? 'Sending...' : 'Add Friend'}
			</Button>
		)
	}

	if (status === 'pending_sent') {
		return (
			<Button onClick={handleCancel} disabled={!!actionLoading} variant='secondary'>
				{actionLoading === 'remove' ? 'Canceling...' : 'Cancel Request'}
			</Button>
		)
	}

	if (status === 'pending_received') {
		return (
			<div className='flex gap-2'>
				{actionLoading !== 'reject' && (
					<Button onClick={handleAccept} disabled={!!actionLoading} variant='confirm'>
						{actionLoading === 'accept' ? 'Accepting...' : 'Accept'}
					</Button>
				)}
				{actionLoading !== 'accept' && (
					<Button onClick={handleReject} disabled={!!actionLoading} variant='secondary'>
						{actionLoading === 'reject' ? 'Declining...' : 'Decline'}
					</Button>
				)}
			</div>
		)
	}

	if (status === 'accepted') {
		if (showRemoveConfirm) {
			return (
				<div className='flex gap-2'>
					<Button onClick={handleRemove} disabled={!!actionLoading} variant='warn'>
						{actionLoading === 'remove' ? 'Removing...' : 'Remove'}
					</Button>
					{!actionLoading && (
						<Button onClick={() => setShowRemoveConfirm(false)} variant='secondary'>
							Cancel
						</Button>
					)}
				</div>
			)
		}
		return (
			<Button onClick={() => setShowRemoveConfirm(true)} variant='ghost'>
				✓ Friends
			</Button>
		)
	}

	return null
}
