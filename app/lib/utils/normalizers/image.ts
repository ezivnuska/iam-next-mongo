// app/lib/utils/normalizeImage.ts

import type { Image } from '@/app/lib/definitions'

export function normalizeImage(img?: any): Image | undefined {
	if (!img) return undefined

	return {
		id: img._id?.toString?.() ?? img.id,
        userId: img.userId,
		username: img.username,
		alt: img.alt ?? '',
		variants: img.variants ?? [],
	}
}
