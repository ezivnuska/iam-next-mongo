// app/lib/utils/normalizePost.ts

import { Post } from '@/app/lib/definitions'
import { normalizeUser } from './user'

export function normalizePost(rawPost: any): Post {
    return {
        ...rawPost,
        id: rawPost.id ?? rawPost._id,
        author: rawPost.author ? normalizeUser(rawPost.author) : undefined,
    }
}

export function normalizePosts(rawPosts: any[]): Post[] {
	return rawPosts.map(normalizePost)
}
