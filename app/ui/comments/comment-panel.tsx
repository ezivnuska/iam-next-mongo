// app/ui/comments/comment-panel.tsx

'use client'

import { useEffect, useState, useCallback } from 'react'
import CommentSection from '@/app/ui/comments/comment-section'
import { useComments } from '@/app/lib/hooks/use-comments'
import type { CommentRefType } from '@/app/lib/definitions/comment'

type CommentPanelProps = {
	expanded: boolean
	itemId: string
	itemType: CommentRefType
	initialCommentCount?: number
	currentUserId?: string
	currentUserRole?: string
	onCommentCountChange?: (count: number) => void
}

export default function CommentPanel({
	expanded,
	itemId,
	itemType,
	initialCommentCount = 0,
	currentUserId,
	currentUserRole,
	onCommentCountChange,
}: CommentPanelProps) {
	const [inputOpen, setInputOpen] = useState(false)
	const [commentText, setCommentText] = useState('')
	const [isSubmitting, setIsSubmitting] = useState(false)

	const {
		comments,
		loadingComments,
		commentsLoaded,
		loadComments,
		createComment,
		deleteComment,
		resetComments,
	} = useComments({
		itemId,
		itemType,
		initialCommentCount,
		onCommentCountChange,
		currentUserId,
	})

	// Reset when item changes
	useEffect(() => {
		setInputOpen(false)
		setCommentText('')
		resetComments()
	}, [itemId, resetComments])

	// Collapse input when panel closes
	useEffect(() => {
		if (!expanded) {
			setInputOpen(false)
			setCommentText('')
		}
	}, [expanded])

	// Load comments when panel first opens
	useEffect(() => {
		if (expanded && !commentsLoaded) loadComments()
	}, [expanded, commentsLoaded, loadComments])

	const handleOpenInput = useCallback(() => setInputOpen(true), [])

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

	if (!expanded) return null

	return (
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
	)
}
