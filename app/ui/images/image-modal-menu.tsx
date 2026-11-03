// app/ui/image-modal-menu.tsx

'use client'

import { useState, useCallback } from 'react'
import LikeButton from '@/app/ui/like-button'
import DeleteButtonWithConfirm from '@/app/ui/delete-button-with-confirm'
import AvatarButton from '@/app/ui/user/set-avatar-button'
import CommentPanel from '@/app/ui/comments/comment-panel'
import { useUser } from '@/app/lib/providers/user-provider'
import { CommentIcon } from '@/app/ui/icons'

type ImageModalMenuProps = {
	imageId: string
	currentUserId?: string
	currentUserRole?: string
	initialLiked?: boolean
	initialLikeCount?: number
	initialCommentCount?: number
	authorized?: boolean
	isAvatar?: boolean
	onDeleted?: () => void
	onLikeChange?: (newLiked: boolean, newCount: number) => void
	onCommentCountChange?: (newCount: number) => void
	onAvatarChange?: (newAvatarId: string | null) => void
}

export default function ImageModalMenu({
	imageId,
	currentUserId,
	currentUserRole,
	initialLiked = false,
	initialLikeCount = 0,
	initialCommentCount = 0,
	authorized = false,
	isAvatar = false,
	onDeleted,
	onLikeChange,
	onCommentCountChange,
	onAvatarChange,
}: ImageModalMenuProps) {
	const { user, setUser } = useUser()
	const [expanded, setExpanded] = useState(false)
	const [commentCount, setCommentCount] = useState(initialCommentCount)

	const handleToggleExpanded = useCallback((e: React.MouseEvent) => {
		e.stopPropagation()
		setExpanded(prev => !prev)
	}, [])

	const handleCommentCountChange = useCallback((count: number) => {
		setCommentCount(count)
		onCommentCountChange?.(count)
	}, [onCommentCountChange])

	return (
		<div
			className='absolute bottom-0 left-0 right-0 flex flex-col bg-white rounded-t-lg shadow-2xl'
			onClick={e => e.stopPropagation()}
		>
			<CommentPanel
				expanded={expanded}
				itemId={imageId}
				itemType='Image'
				initialCommentCount={initialCommentCount}
				currentUserId={currentUserId}
				currentUserRole={currentUserRole}
				onCommentCountChange={handleCommentCountChange}
			/>

			{/* Footer bar — always visible */}
			<div className='flex items-center justify-between px-2 py-1 bg-gray-50 rounded-t-lg'>
				<div className='flex items-center gap-1'>
					<LikeButton
						itemId={imageId}
						itemType='Image'
						initialLiked={initialLiked}
						initialLikeCount={initialLikeCount}
						variant='default'
						onLikeChange={onLikeChange}
					/>
					<button
						onClick={handleToggleExpanded}
						className='flex items-center gap-1 p-1 text-gray-600 hover:text-blue-500 transition-colors'
						aria-label={expanded ? 'Collapse comments' : 'Show comments'}
					>
						<CommentIcon className='w-5 h-5' />
						{commentCount > 0 && (
							<span className='text-sm font-medium'>{commentCount}</span>
						)}
					</button>
				</div>

				{authorized && (
					<div className='flex items-center gap-2'>
						<AvatarButton imageId={imageId} isAvatar={isAvatar} onAvatarChange={onAvatarChange} />
						{onDeleted && (
							<DeleteButtonWithConfirm
								onDelete={async () => {
									const res = await fetch(`/api/images/${imageId}`, { method: 'DELETE' })
									if (!res.ok) throw new Error('Failed to delete image')
									if (user?.avatar?.id === imageId) {
										setUser({ ...user, avatar: null })
									}
									onDeleted()
								}}
							/>
						)}
					</div>
				)}
			</div>
		</div>
	)
}
