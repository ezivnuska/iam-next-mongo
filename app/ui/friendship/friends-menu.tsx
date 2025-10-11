// app/ui/friends-menu.tsx

'use client'

import { useState, useEffect } from 'react'
import UserAvatar from '@/app/ui/user/user-avatar'
import { getFriends, getPendingRequests, removeFriend, acceptFriendRequest, rejectFriendRequest } from '@/app/lib/actions/friendships'
import { useSocket } from '@/app/lib/providers/socket-provider'
import { SOCKET_EVENTS } from '@/app/lib/socket/events'
import type { Friend, Friendship } from '@/app/lib/definitions/friendship'
import type { FriendRequestPayload, FriendshipStatusPayload } from '@/app/lib/socket/events'

type Tab = 'friends' | 'requests'

type FriendsMenuProps = {
	onUpdate?: () => void
}

export default function FriendsMenu({ onUpdate }: FriendsMenuProps) {
	const [activeTab, setActiveTab] = useState<Tab>('friends')
	const [friends, setFriends] = useState<Friend[]>([])
	const [pendingRequests, setPendingRequests] = useState<Friendship[]>([])
	const [loading, setLoading] = useState(true)
	const { socket } = useSocket()

	useEffect(() => {
		loadData()
	}, [])

	// Listen for socket events - only for events that affect the menu lists
	useEffect(() => {
		if (!socket) return

		const handleFriendRequestSent = (payload: FriendRequestPayload) => {
			// Add new request to pending list
			setPendingRequests(prev => [{
				id: payload.friendshipId,
				requester: payload.requester,
				recipient: payload.recipient,
				status: 'pending',
				createdAt: new Date().toISOString(),
				updatedAt: new Date().toISOString(),
			}, ...prev])
		}

		const handleFriendshipRemoved = (payload: FriendshipStatusPayload) => {
			// Remove from friends list
			setFriends(prev => prev.filter(f => f.friendshipId !== payload.friendshipId))
		}

		socket.on(SOCKET_EVENTS.FRIEND_REQUEST_SENT, handleFriendRequestSent)
		socket.on(SOCKET_EVENTS.FRIENDSHIP_REMOVED, handleFriendshipRemoved)

		return () => {
			socket.off(SOCKET_EVENTS.FRIEND_REQUEST_SENT, handleFriendRequestSent)
			socket.off(SOCKET_EVENTS.FRIENDSHIP_REMOVED, handleFriendshipRemoved)
		}
	}, [socket])

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

	const handleRemoveFriend = async (friendshipId: string) => {
		if (!confirm('Are you sure you want to remove this friend?')) return

		try {
			await removeFriend(friendshipId)
			setFriends(prev => prev.filter(f => f.friendshipId !== friendshipId))
		} catch (error) {
			console.error('Failed to remove friend:', error)
			alert('Failed to remove friend')
		}
	}

	const handleAcceptRequest = async (friendshipId: string) => {
		try {
			await acceptFriendRequest(friendshipId)
			setPendingRequests(prev => prev.filter(r => r.id !== friendshipId))
			await loadData() // Reload to show new friend in friends list
			onUpdate?.() // Notify parent component
		} catch (error) {
			console.error('Failed to accept request:', error)
			alert('Failed to accept friend request')
		}
	}

	const handleRejectRequest = async (friendshipId: string) => {
		try {
			await rejectFriendRequest(friendshipId)
			setPendingRequests(prev => prev.filter(r => r.id !== friendshipId))
		} catch (error) {
			console.error('Failed to reject request:', error)
			alert('Failed to reject friend request')
		}
	}

	return (
		<div className="bg-white rounded-lg shadow-lg p-4 max-w-md w-full">
			<h2 className="text-xl font-bold mb-4">Friends & Bonds</h2>

			{/* Tabs */}
			<div className="flex gap-2 mb-4 border-b">
				<button
					className={`px-4 py-2 font-medium transition-colors ${
						activeTab === 'friends'
							? 'border-b-2 border-blue-600 text-blue-600'
							: 'text-gray-600 hover:text-gray-900'
					}`}
					onClick={() => setActiveTab('friends')}
				>
					Friends ({friends.length})
				</button>
				<button
					className={`px-4 py-2 font-medium transition-colors relative ${
						activeTab === 'requests'
							? 'border-b-2 border-blue-600 text-blue-600'
							: 'text-gray-600 hover:text-gray-900'
					}`}
					onClick={() => setActiveTab('requests')}
				>
					Requests ({pendingRequests.length})
					{pendingRequests.length > 0 && (
						<span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
							{pendingRequests.length}
						</span>
					)}
				</button>
			</div>

			{/* Content */}
			<div className="max-h-96 overflow-y-auto">
				{loading ? (
					<div className="text-center py-8 text-gray-500">Loading...</div>
				) : activeTab === 'friends' ? (
					<FriendsList friends={friends} onRemove={handleRemoveFriend} />
				) : (
					<RequestsList
						requests={pendingRequests}
						onAccept={handleAcceptRequest}
						onReject={handleRejectRequest}
					/>
				)}
			</div>
		</div>
	)
}

function FriendsList({ friends, onRemove }: { friends: Friend[]; onRemove: (id: string) => void }) {
	if (friends.length === 0) {
		return (
			<div className="text-center py-8 text-gray-500">
				No friends yet. Start connecting with others!
			</div>
		)
	}

	return (
		<div className="space-y-3">
			{friends.map((friend) => {
				const avatarUrl = friend.avatar?.variants.find(v => v.size === 'small')?.url
				return (
					<div key={friend.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
						<div className="flex items-center gap-3">
							<UserAvatar
								username={friend.username}
								avatarUrl={avatarUrl}
								size={40}
							/>
							<div>
								<p className="font-semibold text-sm">{friend.username}</p>
								<p className="text-xs text-gray-500">
									Friends since {new Date(friend.friendsSince).toLocaleDateString()}
								</p>
							</div>
						</div>
						<button
							onClick={() => onRemove(friend.friendshipId)}
							className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
						>
							Remove
						</button>
					</div>
				)
			})}
		</div>
	)
}

function RequestsList({
	requests,
	onAccept,
	onReject
}: {
	requests: Friendship[]
	onAccept: (id: string) => void
	onReject: (id: string) => void
}) {
	if (requests.length === 0) {
		return (
			<div className="text-center py-8 text-gray-500">
				No pending friend requests
			</div>
		)
	}

	return (
		<div className="space-y-3">
			{requests.map((request) => {
				const avatarUrl = request.requester.avatar?.variants.find(v => v.size === 'small')?.url
				return (
					<div key={request.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
						<div className="flex items-center gap-3">
							<UserAvatar
								username={request.requester.username}
								avatarUrl={avatarUrl}
								size={40}
							/>
							<div>
								<p className="font-semibold text-sm">{request.requester.username}</p>
								<p className="text-xs text-gray-500">
									{new Date(request.createdAt).toLocaleDateString()}
								</p>
							</div>
						</div>
						<div className="flex gap-2">
							<button
								onClick={() => onAccept(request.id)}
								className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
							>
								Accept
							</button>
							<button
								onClick={() => onReject(request.id)}
								className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-200 rounded transition-colors"
							>
								Reject
							</button>
						</div>
					</div>
				)
			})}
		</div>
	)
}
