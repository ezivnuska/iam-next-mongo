// app/ui/user-avatar.tsx

import Image from 'next/image'

interface UserAvatarProps {
	username: string
	avatarUrl?: string
	size?: number
	className?: string
}

export default function UserAvatar({
	username,
	avatarUrl,
	size = 40,
	className = ''
}: UserAvatarProps) {
	if (avatarUrl) {
		return (
			<Image
				src={avatarUrl}
				alt={username}
				width={size}
				height={size}
				className={`rounded-full object-cover ${className}`}
			/>
		)
	}

	return (
		<div
			className={`rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold ${className}`}
			style={{ width: size, height: size }}
		>
			{username[0].toUpperCase()}
		</div>
	)
}
