'use client'

import { TrashIcon } from '@/app/ui/icons'
import UserAvatar from '@/app/ui/user/user-avatar'
import { formatRelativeTime } from '@/app/lib/utils/format-date'
import { canDeleteComment } from '@/app/lib/utils/auth/permissions'
import type { Comment } from '@/app/lib/definitions/comment'
import { useIsDark } from '@/app/lib/hooks/use-is-dark'
import { getTextColor, getSecondaryTextColor } from '@/app/lib/utils/theme-colors'

type CommentListProps = {
	comments: Comment[]
	currentUserId?: string
	currentUserRole?: string
	onDelete?: (commentId: string) => void
}

export default function CommentList({ comments, currentUserId, currentUserRole, onDelete }: CommentListProps) {
	const isDark = useIsDark();

	if (comments.length === 0) {
		return (
			<div className='text-center py-8' style={{ color: getSecondaryTextColor(isDark) }}>
				No comments yet. Be the first to comment!
			</div>
		)
	}

	return (
		<div className='space-y-4 py-2'>
			{comments.map((comment) => {
				const avatarUrl = comment.author.avatar?.variants.find((v) => v.size === 'small')?.url
				const canDelete = canDeleteComment(comment.author.id, currentUserId, currentUserRole)
				return (
					<div key={comment.id} className='flex gap-3'>
						<div className='w-8 h-8'>
							<UserAvatar
								username={comment.author.username}
								avatarUrl={avatarUrl}
								size={40}
							/>
						</div>
						<div className='flex-1 min-w-0'>
							<div className='flex items-center gap-2 mb-1'>
								<span className='font-semibold text-sm' style={{ color: getTextColor(isDark) }}>
									{comment.author.username}
								</span>
								<span className='text-xs' style={{ color: getSecondaryTextColor(isDark) }}>
									{formatRelativeTime(comment.createdAt)}
								</span>
							</div>
							<p className='text-sm whitespace-pre-wrap wrap-break-word' style={{ color: getTextColor(isDark) }}>
								{comment.content}
							</p>
						</div>
						{canDelete && onDelete && (
							<div className='shrink-0'>
								<button
									onClick={(e) => {
										e.stopPropagation();
										onDelete(comment.id);
									}}
									className='p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors'
									aria-label='Delete comment'
								>
									<TrashIcon className='w-5 h-5' />
								</button>
							</div>
						)}
					</div>
				)
			})}
		</div>
	)
}
