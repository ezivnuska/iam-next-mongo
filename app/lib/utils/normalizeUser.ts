// app/lib/utils/normalizeUser.ts

import type { User } from '@/app/lib/definitions'
import { normalizeImage } from './normalizeImage'

export function normalizeUser(user: any): User {
	return {
		id: user.id ?? user._id.toString(),
		username: user.username,
		email: user.email,
		role: user.role,
		bio: user.bio ?? '',
		verified: user.verified ?? false,
		createdAt: user.createdAt,
		updatedAt: user.updatedAt,
		avatar: normalizeImage(user.avatar),
	}
}

export function normalizeUsers(rawUsers: any[]): User[] {
    return rawUsers.map(normalizeUser)
}
