// app/ui/user-list.tsx

'use client'

import Link from 'next/link'
import UserAvatar from '@/app/ui/user/user-avatar'
import OnlineStatusIndicator from '@/app/ui/user/online-status-indicator'
import FriendshipButton from '@/app/ui/friendship/friendship-button'
import { useUser } from '@/app/lib/providers/user-provider'
import { useSocket } from '@/app/lib/providers/socket-provider'
import type { User } from '@/app/lib/definitions/user'

type UserListProps = {
	users: User[]
}

export default function UserList({ users }: UserListProps) {
	const { user: currentUser } = useUser()
	const { onlineUsers } = useSocket()

	if (!users || users.length === 0) {
		return <p className="text-gray-500">No users found</p>
	}

	return (
		<div className="space-y-1">
			{users.map((user) => {
				const isCurrentUser = currentUser?.id === user.id
				const isOnline = onlineUsers.has(user.id)

				return (
					<div
						key={user.id}
						className="flex items-center justify-between p-3 bg-white hover:bg-amber-100 rounded-lg shadow hover:shadow-md transition-shadow"
					>
                        <Link
                            href={`/users/${user.username}`}
                            className="flex items-center gap-3 flex-1 hover:text-blue-600 transition-colors"
                        >
                            <div className="relative">
                                <UserAvatar
                                    username={user.username}
                                    avatar={user.avatar}
                                    size={36}
                                />
                                <div className="absolute bottom-0 -right-1 z-100">
                                    <OnlineStatusIndicator size={14} isOnline={isOnline} />
                                </div>
                            </div>
                            <div className="flex flex-col flex-1">
								<p className="font-semibold">{user.username}</p>
								{user.bio && (
									<p className="text-sm text-gray-500 truncate">{user.bio}</p>
								)}
                            </div>
                        </Link>

						<div className="flex-shrink-0 ml-3">
							<FriendshipButton
								userId={user.id}
								username={user.username}
								isCurrentUser={isCurrentUser}
							/>
						</div>
					</div>
				)
			})}
		</div>
	)
}
