// app/ui/image-modal-menu.tsx

'use client'

import { useEffect, useState, useCallback } from 'react'
import CommentSection from '@/app/ui/comments/comment-section'
import LikeButton from '@/app/ui/like-button'
import DeleteButtonWithConfirm from '@/app/ui/delete-button-with-confirm'
import AvatarButton from '@/app/ui/user/set-avatar-button'
import { useComments } from '@/app/lib/hooks/use-comments'
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
	const [inputOpen, setInputOpen] = useState(false)
	const [commentText, setCommentText] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)

	const {
		comments,
		commentCount,
		loadingComments,
		commentsLoaded,
		loadComments,
		createComment,
		deleteComment,
		resetComments,
	} = useComments({
		itemId: imageId,
		itemType: 'Image',
		initialCommentCount,
		onCommentCountChange,
		currentUserId: currentUserId || user?.id,
	})

	// Reset everything when the image changes
	useEffect(() => {
		setExpanded(false)
		setInputOpen(false)
		setCommentText('')
		resetComments()
	}, [imageId, resetComments])

	// Load comments when panel first opens
	useEffect(() => {
		if (expanded && !commentsLoaded) loadComments()
	}, [expanded, commentsLoaded, loadComments])

	const handleToggleExpanded = useCallback((e: React.MouseEvent) => {
		e.stopPropagation()
		setExpanded(prev => !prev)
		setInputOpen(false)
	}, [])

	const handleOpenInput = useCallback(() => {
		setInputOpen(true)
	}, [])

	const handleCancelInput = useCallback(() => {
		setInputOpen(false)
		setCommentText('')
	}, [])

	const handleSubmit = useCallback(async (e: React.FormEvent) => {
		e.preventDefault()
		if (!commentText.trim() || isSubmitting) return
		setIsSubmitting(true)
		try {
			await createComment(commentText.trim())
			setCommentText('')
			setInputOpen(false)
		} finally {
			setIsSubmitting(false)
		}
	}, [commentText, isSubmitting, createComment])

	return (
		<div
			className='absolute bottom-0 left-0 right-0 flex flex-col bg-white rounded-t-lg shadow-2xl'
			onClick={e => e.stopPropagation()}
		>
			{/* Expanded content — slides in above the footer bar */}
			{expanded && (
				<div className='flex flex-col max-h-[50vh] overflow-hidden border-b border-gray-200'>
					{inputOpen ? (
						<form onSubmit={handleSubmit} className='p-3 flex flex-col gap-2'>
							<textarea
								value={commentText}
								onChange={e => setCommentText(e.target.value)}
								placeholder='Write a comment...'
								disabled={isSubmitting}
								autoFocus
								rows={3}
								className='w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder:text-gray-400'
							/>
							<div className='flex justify-end gap-2'>
								<button
									type='button'
									onClick={handleCancelInput}
									className='px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 transition-colors'
								>
									Cancel
								</button>
								<button
									type='submit'
									disabled={isSubmitting || !commentText.trim()}
									className='px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
								>
									{isSubmitting ? 'Posting...' : 'Post'}
								</button>
							</div>
						</form>
					) : (
						<>
							<button
								type='button'
								onClick={handleOpenInput}
								className='mx-3 mt-2 mb-1 px-3 py-1.5 text-left text-sm text-gray-400 border border-gray-200 rounded-full bg-white hover:bg-gray-50 transition-colors shrink-0'
							>
								Add a comment...
							</button>
							<div className='flex-1 overflow-y-auto'>
								<CommentSection
									comments={comments}
									loading={loadingComments}
									currentUserId={currentUserId}
									currentUserRole={currentUserRole}
									onDelete={deleteComment}
									loadingMessage='Loading comments...'
								/>
							</div>
						</>
					)}
				</div>
			)}

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
