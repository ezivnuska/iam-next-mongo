// app/lib/definitions/comment.ts

export type CommentRefType = 'Memory' | 'Post' | 'Image'

export interface CommentAuthor {
	id: string
	username: string
	avatar: {
		id: string
		variants: Array<{
			size: string
			width: number
			height: number
			url: string
		}>
	} | null
}

export interface Comment {
	id: string
	refId: string
	refType: CommentRefType
	author: CommentAuthor
	content: string
	createdAt: string
}
