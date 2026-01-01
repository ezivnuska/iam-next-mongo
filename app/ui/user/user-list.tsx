// app/ui/user-list.tsx

'use client'

import FriendshipButton from '@/app/ui/friendship/friendship-button'
import { useUser } from '@/app/lib/providers/user-provider'
import { useSocket } from '@/app/lib/providers/socket-provider'
import type { User } from '@/app/lib/definitions/user'
import UnifiedUserHeader from './unified-user-header'

type UserListProps = {
	users: User[]
}

export default function UserList({ users }: UserListProps) {
	const { user: currentUser } = useUser()
	const { onlineUsers } = useSocket()

	if (!users || users.length === 0) {
		return <p className='text-gray-500 dark:text-gray-400'>No users found</p>
	}

	return (
		<div className='flex flex-1 flex-col space-y-1'>
			{users.map((user) => {
				const isCurrentUser = currentUser?.id === user.id
				const isOnline = onlineUsers.has(user.id)
                const props = {
                    userId: user.id,
                    username: user.username,
                    isCurrentUser,
                };
				return (
                    <div
                        key={`user-${user.id}`}
                        className='flex items-stretch justify-stretch py-2'
                    >
                        <UnifiedUserHeader
                            className='flex flex-row items-center w-full'
                            user={{ id: user.id, username: user.username }}
                            avatar={user.avatar}
                            showOnlineStatus
                            isOnline={isOnline}
                            variant='card'
                            clickable
                            actions={<FriendshipButton {...props} />}
                        />
                    </div>
				)
			})}
		</div>
	)
}
