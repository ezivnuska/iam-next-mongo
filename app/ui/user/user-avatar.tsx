// app/ui/user-avatar.tsx

"use client";

import { useState, useEffect } from 'react'
import Image from 'next/image'
import type { Image as ImageType } from '@/app/lib/definitions/image'
import { ComputerDesktopIcon } from '@heroicons/react/24/solid'
import { getBestVariant } from '@/app/lib/utils/images'

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
	if (!imageUrl && avatarToUse) {
		const bestVariant = getBestVariant(avatarToUse, size)
		imageUrl = bestVariant?.url
	}

	// Guard against null/undefined/"null" string values
	const validImageUrl = imageUrl && imageUrl !== 'null' && imageUrl !== 'undefined' ? imageUrl : null;

	return (
		<div className={`flex flex-row items-center justify-center w-full h-full rounded-full bg-gray-400 dark:bg-gray-600 text-gray-600 dark:text-gray-300 font-semibold border-2 border-white dark:border-gray-700 ${className}`}>
			{isAI
                ? <ComputerDesktopIcon className="text-white dark:text-gray-300" style={{ width: 16, height: 16 }} />
			    : validImageUrl
                    ? (
                        <Image
                            src={validImageUrl}
                            alt={username}
                            width={size}
                            height={size}
                            className="w-full h-full object-cover rounded-full overflow-hidden"
                        />
                    )
                    : <p className={`text-[16px] text-white dark:text-gray-300`}>{username?.[0]?.toUpperCase() || '?'}</p>
            }
		</div>
	)
}
