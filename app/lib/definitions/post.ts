// app/lib/definitions/post.ts

import type { UploadedImage } from './image'
import { PartialUser } from './user'

export interface Post {
	id: string
	content: string
	createdAt: string
	updatedAt: string
	author: PartialUser
    likes: string[]
    likedByCurrentUser: boolean
    image?: UploadedImage
    linkUrl?: string
	linkPreview?: {
		title?: string
		description?: string
		image?: string
	}
}
