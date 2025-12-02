// app/ui/user-avatar.tsx

"use client";

import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { Image as ImageType } from '@/app/lib/definitions/image'
import { ComputerDesktopIcon } from '@heroicons/react/24/solid'

interface UserAvatarProps {
	username: string
	avatar?: ImageType | null
	avatarUrl?: string
	size?: number
	className?: string
	isAI?: boolean
}

export default function UserAvatar({
	username,
	avatar,
	avatarUrl,
	size = 20,
	className = '',
	isAI = false
}: UserAvatarProps) {
	const [fetchedAvatar, setFetchedAvatar] = useState<ImageType | null>(null)
	const [loading, setLoading] = useState(false)

	// Fetch avatar by username if not provided
	useEffect(() => {
		if (!avatar && !avatarUrl && username && !fetchedAvatar) {
			setLoading(true)
			fetch(`/api/users/${username}/avatar`)
				.then(res => res.ok ? res.json() : null)
				.then(data => {
					if (data?.avatar) {
						setFetchedAvatar(data.avatar)
					}
					setLoading(false)
				})
				.catch(() => {
					setLoading(false)
				})
		}
	}, [username, avatar, avatarUrl, fetchedAvatar])

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

	// Guard against null/undefined/"null" string values
	const validImageUrl = imageUrl && imageUrl !== 'null' && imageUrl !== 'undefined' ? imageUrl : null;

	if (validImageUrl) {
		return (
			// <div
				// className={`rounded-full overflow-hidden flex-shrink-0 border-1 ${className}`}
				// style={{ width: size, height: size }}
			// >
				<Image
					src={validImageUrl}
					alt={username}
					width={size}
					height={size}
					className="w-full h-full object-cover rounded-full overflow-hidden"
				/>
			// </div>
		)
	}
	return (
		<div
			className={`flex flex-row items-center justify-center w-full h-full rounded-full bg-gray-400 text-gray-600 font-semibold flex-shrink-0 ${className}`}
			// style={{ width: size, height: size }}
		>
			{isAI ? (
				<ComputerDesktopIcon className="text-white" style={{ width: 16, height: 16 }} />
			) : (
				<p className={`text-[16px] text-white`}>{username?.[0]?.toUpperCase() || '?'}</p>
			)}
		</div>
	)
}
