// app/ui/friends-menu.tsx

'use client'

import { useState, useEffect } from 'react'
import { getFriends, getPendingRequests } from '@/app/lib/actions/friendships'
import { useFriendshipSocketEvents } from '@/app/lib/hooks/useFriendshipSocketEvents'
import { useFriendshipActions } from '@/app/lib/hooks/useFriendshipActions'
import { showError } from '@/app/lib/utils/error-handler'
import type { Friend, Friendship } from '@/app/lib/definitions/friendship'
import type { FriendRequestPayload, FriendshipStatusPayload } from '@/app/lib/socket/events'
import { Button } from '../button'
import FriendCard from './friend-card'
import UnifiedUserHeader from '../user/unified-user-header'

type Tab = 'friends' | 'requests'

type FriendsMenuProps = {
	onUpdate?: () => void
}

export default function FriendsMenu({ onUpdate }: FriendsMenuProps) {
	const [activeTab, setActiveTab] = useState<Tab>('friends')
	const [friends, setFriends] = useState<Friend[]>([])
	const [pendingRequests, setPendingRequests] = useState<Friendship[]>([])
	const [loading, setLoading] = useState(true)
	const { actionLoading, handleAcceptRequest, handleRejectRequest, handleRemoveFriend } = useFriendshipActions()

	useEffect(() => {
		loadData()
	}, [])

	// Listen for socket events
	useFriendshipSocketEvents({
		isCurrentUser: true,
		onFriendRequestSent: (payload: FriendRequestPayload) => {
			setPendingRequests(prev => [{
				id: payload.friendshipId,
				requester: payload.requester,
				recipient: payload.recipient,
				status: 'pending',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			}, ...prev])
		},
		onFriendshipRemoved: (payload: FriendshipStatusPayload) => {
			setFriends(prev => prev.filter(f => f.friendshipId !== payload.friendshipId))
		},
	})

	const loadData = async () => {
		setLoading(true)
		try {
			const [friendsData, requestsData] = await Promise.all([
				getFriends(),
				getPendingRequests()
			])
			setFriends(friendsData)
			setPendingRequests(requestsData)
		} catch (error) {
			console.error('Failed to load friends data:', error)
		} finally {
			setLoading(false)
		}
	}

	const handleRemove = async (friendshipId: string) => {
		if (!confirm('Are you sure you want to remove this friend?')) return

		try {
			await handleRemoveFriend(friendshipId)
			setFriends(prev => prev.filter(f => f.friendshipId !== friendshipId))
		} catch (error) {
			showError(error, 'Failed to remove friend')
		}
	}

	const handleAccept = async (friendshipId: string) => {
		try {
			await handleAcceptRequest(friendshipId)
			setPendingRequests(prev => prev.filter(r => r.id !== friendshipId))
			await loadData()
			onUpdate?.()
		} catch (error) {
			showError(error, 'Failed to accept friend request')
		}
	}

	const handleReject = async (friendshipId: string) => {
		try {
			await handleRejectRequest(friendshipId)
			setPendingRequests(prev => prev.filter(r => r.id !== friendshipId))
		} catch (error) {
			showError(error, 'Failed to reject friend request')
		}
	}

	return (
		<div className='bg-white rounded-lg shadow-lg p-4 max-w-md w-full'>
			<h2 className='text-xl font-bold mb-4'>Friends & Bonds</h2>

			{/* Tabs */}
			<div className='flex gap-2 mb-4 border-b'>
				<Button
					className={`px-4 py-2 font-medium transition-colors ${
						activeTab === 'friends'
							? 'border-b-2 border-blue-600 text-blue-600'
							: 'text-gray-600 hover:text-gray-900'
					}`}
					onClick={() => setActiveTab('friends')}
				>
					Friends ({friends.length})
				</Button>
				<Button
					className={`px-4 py-2 font-medium transition-colors relative ${
						activeTab === 'requests'
							? 'border-b-2 border-blue-600 text-blue-600'
							: 'text-gray-600 hover:text-gray-900'
					}`}
					onClick={() => setActiveTab('requests')}
				>
					Requests ({pendingRequests.length})
					{pendingRequests.length > 0 && (
						<span className='absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center'>
							{pendingRequests.length}
						</span>
					)}
				</Button>
			</div>

			{/* Content */}
			<div className='max-h-96 overflow-y-auto'>
				{loading ? (
					<div className='text-center py-8 text-gray-500'>Loading...</div>
				) : activeTab === 'friends' ? (
					<FriendsList friends={friends} onRemove={handleRemove} loading={!!actionLoading} />
				) : (
					<RequestsList
						requests={pendingRequests}
						onAccept={handleAccept}
						onReject={handleReject}
						loading={!!actionLoading}
					/>
				)}
			</div>
		</div>
	)
}

function FriendsList({ friends, onRemove, loading }: { friends: Friend[]; onRemove: (id: string) => void; loading: boolean }) {
	if (friends.length === 0) {
		return (
			<div className='text-center py-8 text-gray-500'>
				No friends yet. Start connecting with others!
			</div>
		)
	}

	return (
		<div className='space-y-3'>
			{friends.map((friend) => {
				const avatarUrl = friend.avatar?.variants.find(v => v.size === 'small')?.url
				return (
                    <UnifiedUserHeader
                        key={friend.id}
                        user={{ id: friend.id, username: friend.username }}
                        avatar={avatarUrl}
                        subtitle={`Friends since ${new Date(friend.friendsSince).toLocaleDateString()}`}
                        actions={
							<Button
								size='sm'
								variant='warn'
								onClick={() => onRemove(friend.friendshipId)}
								disabled={loading}
							>
								Remove
							</Button>
						}
                        avatarSize={40}
                        variant='card'
                    />
				)
			})}
		</div>
	)
}

function RequestsList({
	requests,
	onAccept,
	onReject,
	loading
}: {
	requests: Friendship[]
	onAccept: (id: string) => void
	onReject: (id: string) => void
	loading: boolean
}) {
	if (requests.length === 0) {
		return (
			<div className='text-center py-8 text-gray-500'>
				No pending friend requests
			</div>
		)
	}

	return (
		<div className='space-y-3'>
			{requests.map((request) => {
				const avatarUrl = request.requester.avatar?.variants.find(v => v.size === 'small')?.url
				return (
                    <UnifiedUserHeader
                        key={request.id}
                        user={{ id: request.id, username: request.requester.username }}
                        avatar={avatarUrl}
                        subtitle={new Date(request.createdAt).toLocaleDateString()}
                        actions={
							<>
								<Button
									size='sm'
									variant='default'
									onClick={() => onAccept(request.id)}
									disabled={loading}
								>
									Accept
								</Button>
								<Button
									size='sm'
									variant='secondary'
									onClick={() => onReject(request.id)}
									disabled={loading}
								>
									Reject
								</Button>
							</>
						}
                        avatarSize={40}
                        variant='card'
					/>
				)
			})}
		</div>
	)
}
