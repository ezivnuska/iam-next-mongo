'use client'

import Image from 'next/image'

type Comment = {
	id: string
	author: {
		id: string
		username: string
		avatar: {
			id: string
			variants: Array<{
				size: string
				filename: string
				width: number
				height: number
				url: string
			}>
		} | null
	}
	content: string
	createdAt: string
}

type CommentListProps = {
	comments: Comment[]
}

export default function CommentList({ comments }: CommentListProps) {
	const formatDate = (dateString: string) => {
		const date = new Date(dateString)
		const now = new Date()
		const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

		if (diffInSeconds < 60) return 'just now'
		if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
		if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
		if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`

		return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
	}

	if (comments.length === 0) {
		return (
			<div className="text-center text-gray-500 py-8">
				No comments yet. Be the first to comment!
			</div>
		)
	}

	return (
		<div className="space-y-4">
			{comments.map((comment) => {
				const avatarUrl = comment.author.avatar?.variants.find((v) => v.size === 'small')?.url
				return (
					<div key={comment.id} className="flex gap-3">
						<div className="flex-shrink-0">
							{avatarUrl ? (
								<Image
									src={avatarUrl}
									alt={comment.author.username}
									width={40}
									height={40}
									className="rounded-full object-cover"
								/>
							) : (
								<div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 font-semibold">
									{comment.author.username[0].toUpperCase()}
								</div>
							)}
						</div>
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2 mb-1">
								<span className="font-semibold text-sm">{comment.author.username}</span>
								<span className="text-xs text-gray-500">{formatDate(comment.createdAt)}</span>
							</div>
							<p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
								{comment.content}
							</p>
						</div>
					</div>
				)
			})}
		</div>
	)
}
