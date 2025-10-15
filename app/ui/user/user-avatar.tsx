// app/ui/user-avatar.tsx

"use client";

import { useState, useEffect } from 'react'
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
	const [fetchedAvatar, setFetchedAvatar] = useState<ImageType | null>(null)
	const [loading, setLoading] = useState(false)

	// Fetch avatar by username if not provided
	useEffect(() => {
		if (!avatar && !avatarUrl && username && !fetchedAvatar && !loading) {
			setLoading(true)
			fetch(`/api/users/${username}/avatar`)
				.then(res => res.ok ? res.json() : null)
				.then(data => {
					if (data?.avatar) {
						setFetchedAvatar(data.avatar)
					}
				})
				.catch(() => {})
				.finally(() => setLoading(false))
		}
	}, [username, avatar, avatarUrl, fetchedAvatar, loading])

	// Determine the best avatar URL to use
	const avatarToUse = avatar || fetchedAvatar
	let imageUrl = avatarUrl

	// If avatar object is provided, select best variant
	if (!imageUrl && avatarToUse?.variants?.length) {
		const bestVariant = avatarToUse.variants.reduce((closest, current) => {
			if (!current.width) return closest
			return Math.abs(current.width - size) < Math.abs((closest.width ?? 0) - size)
				? current
				: closest
		}, avatarToUse.variants[0])
		imageUrl = bestVariant.url
	}

	if (imageUrl) {
		return (
			<div
				className={`rounded-full overflow-hidden flex-shrink-0 border-1 ${className}`}
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
			className={`rounded-full bg-gray-400 flex items-center justify-center text-gray-600 font-semibold flex-shrink-0 ${className}`}
			style={{ width: size, height: size }}
		>
			<p className={`text-[30px] text-white`}>{username?.[0]?.toUpperCase() || '?'}</p>
		</div>
	)
}
