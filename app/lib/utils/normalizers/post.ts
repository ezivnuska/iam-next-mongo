// app/lib/utils/normalizePost.ts

import { Post } from '@/app/lib/definitions'
import { normalizeUser } from './user'
import type { UserDocument } from '@/app/lib/definitions'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizePost(rawPost: any): Post {
    return {
        ...rawPost,
        id: rawPost.id ?? rawPost._id,
        author: rawPost.author ? normalizeUser(rawPost.author as UserDocument) : undefined,
    }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function normalizePosts(rawPosts: any[]): Post[] {
	return rawPosts.map(normalizePost)
}
