// app/lib/utils/normalizeImage.ts

import { getAvatarUrl } from './getAvatarUrl'
import type { Image } from '@/app/lib/definitions'

export function normalizeImage(img?: any): Image | undefined {
	if (!img) return undefined

	const url = img.url ?? getAvatarUrl(img.username, img.filename) ?? ''

	return {
		id: img._id?.toString?.() ?? img.id,
        userId: img.userId,
		filename: img.filename,
		username: img.username,
		url,
		alt: img.alt ?? '',
		variants: img.variants ?? [],
        likes: img.likes,
        likedByCurrentUser: img.likedByCurrentUser,
	}
}
