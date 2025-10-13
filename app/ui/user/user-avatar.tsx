// app/ui/user-avatar.tsx

import Image from 'next/image'
import type { Image as ImageType } from '@/app/lib/definitions/image'

interface UserAvatarProps {
	username: string
	avatar?: ImageType | null
	avatarUrl?: string
	size?: number
	className?: string
}

export default function UserAvatar({
	username,
	avatar,
	avatarUrl,
	size = 40,
	className = ''
}: UserAvatarProps) {
	// Determine the best avatar URL to use
	let imageUrl = avatarUrl

	// If avatar object is provided, select best variant
	if (!imageUrl && avatar?.variants?.length) {
		const bestVariant = avatar.variants.reduce((closest, current) => {
			if (!current.width) return closest
			return Math.abs(current.width - size) < Math.abs((closest.width ?? 0) - size)
				? current
				: closest
		}, avatar.variants[0])
		imageUrl = bestVariant.url
	}

	if (imageUrl) {
		return (
			<div
				className={`rounded-full overflow-hidden flex-shrink-0 ${className}`}
				style={{ width: size, height: size }}
			>
				<Image
					src={imageUrl}
					alt={username}
					width={size}
					height={size}
					className="w-full h-full object-cover"
				/>
			</div>
		)
	}

	return (
		<div
			className={`rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold flex-shrink-0 ${className}`}
			style={{ width: size, height: size }}
		>
			{username?.[0]?.toUpperCase() || '?'}
		</div>
	)
}
