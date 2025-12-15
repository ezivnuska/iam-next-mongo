'use client'

import { TrashIcon } from '@/app/ui/icons'
import UserAvatar from '@/app/ui/user/user-avatar'
import { formatRelativeTime } from '@/app/lib/utils/format-date'
import { canDeleteComment } from '@/app/lib/utils/auth/permissions'
import type { Comment } from '@/app/lib/definitions/comment'

type CommentListProps = {
	comments: Comment[]
	currentUserId?: string
	currentUserRole?: string
	onDelete?: (commentId: string) => void
}

export default function CommentList({ comments, currentUserId, currentUserRole, onDelete }: CommentListProps) {

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
				const canDelete = canDeleteComment(comment.author.id, currentUserId, currentUserRole)
				return (
					<div key={comment.id} className="flex gap-3">
						<div className="w-12 h-12">
							<UserAvatar
								username={comment.author.username}
								avatarUrl={avatarUrl}
								size={40}
							/>
						</div>
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-2 mb-1">
								<span className="font-semibold text-sm">{comment.author.username}</span>
								<span className="text-xs text-gray-500">{formatRelativeTime(comment.createdAt)}</span>
							</div>
							<p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
								{comment.content}
							</p>
						</div>
						{canDelete && onDelete && (
							<div className="flex-shrink-0">
								<button
									onClick={(e) => {
										e.stopPropagation();
										onDelete(comment.id);
									}}
									className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
									aria-label="Delete comment"
								>
									<TrashIcon className="w-5 h-5" />
								</button>
							</div>
						)}
					</div>
				)
			})}
		</div>
	)
}
