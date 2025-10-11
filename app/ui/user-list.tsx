// app/ui/user-list.tsx

'use client'

import Link from 'next/link'
import Avatar from '@/app/ui/avatar'
import FriendshipButton from '@/app/ui/friendship-button'
import { useUser } from '@/app/lib/providers/user-provider'
import type { User } from '@/app/lib/definitions/user'

type UserListProps = {
	users: User[]
}

export default function UserList({ users }: UserListProps) {
	const { user: currentUser } = useUser()

	if (!users || users.length === 0) {
		return <p className="text-gray-500">No users found</p>
	}

	return (
		<div className="space-y-3">
			{users.map((user) => {
				const isCurrentUser = currentUser?.id === user.id

				return (
					<div
						key={user.id}
						className="flex items-center justify-between p-3 bg-white rounded-lg shadow hover:shadow-md transition-shadow"
					>
						<div className="flex items-center gap-3 flex-1">
							<Avatar
								avatar={user.avatar}
								size={40}
								className="flex-shrink-0"
							/>
							<Link
								href={`/users/${user.username}`}
								className="flex-1 hover:text-blue-600 transition-colors"
							>
								<p className="font-semibold">{user.username}</p>
								{user.bio && (
									<p className="text-sm text-gray-500 truncate">{user.bio}</p>
								)}
							</Link>
						</div>

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
