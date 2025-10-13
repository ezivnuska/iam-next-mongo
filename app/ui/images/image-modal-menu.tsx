// app/ui/image-modal-menu.tsx

'use client'

import { useState, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react'
import CommentList from '@/app/ui/comments/comment-list'
import LikeButton from '@/app/ui/like-button'
import DeleteButton from '@/app/ui/images/delete-image-button'
import AvatarButton from '@/app/ui/user/set-avatar-button'
import { CommentIcon, ChevronUpIcon } from '@/app/ui/icons'
import { getComments, deleteComment } from '@/app/lib/actions/comments'
import type { Comment } from '@/app/lib/definitions/comment'

type ImageModalMenuProps = {
	isExpanded: boolean
	onToggleExpanded: (e: React.MouseEvent) => void
	onOpenCommentForm: (e: React.MouseEvent) => void
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
}

export type ImageModalMenuHandle = {
	addComment: (comment: Comment) => void
}

const ImageModalMenu = forwardRef<ImageModalMenuHandle, ImageModalMenuProps>(({
	isExpanded,
	onToggleExpanded,
	onOpenCommentForm,
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
}, ref) => {
	const [comments, setComments] = useState<Comment[]>([])
	const [commentCount, setCommentCount] = useState(initialCommentCount)
	const [loadingComments, setLoadingComments] = useState(false)
	const [commentsLoaded, setCommentsLoaded] = useState(false)

	// Notify parent when comment count changes
	useEffect(() => {
		if (commentCount !== initialCommentCount) {
			onCommentCountChange?.(commentCount)
		}
	}, [commentCount])

	const loadComments = useCallback(async () => {
		if (!imageId) return
		setLoadingComments(true)
		try {
			const fetchedComments = await getComments(imageId, 'Image')
			setComments(fetchedComments)
			setCommentCount(fetchedComments.length)
			setCommentsLoaded(true)
		} catch (error) {
			console.error('Failed to load comments:', error)
		} finally {
			setLoadingComments(false)
		}
	}, [imageId])

	useEffect(() => {
		if (imageId && isExpanded && !commentsLoaded) {
			loadComments()
		}
	}, [imageId, isExpanded, commentsLoaded, loadComments])

	// Reset comments when image changes
	useEffect(() => {
		setComments([])
		setCommentsLoaded(false)
		setCommentCount(initialCommentCount)
	}, [imageId, initialCommentCount])

	const addComment = useCallback((comment: Comment) => {
		setComments(prev => [comment, ...prev])
		setCommentCount(prev => prev + 1)
	}, [])

	const handleDeleteComment = useCallback(async (commentId: string) => {
		// Optimistic update
		const previousComments = comments
		const previousCount = commentCount
		setComments(prev => prev.filter(comment => comment.id !== commentId))
		setCommentCount(prev => prev - 1)

		try {
			await deleteComment(commentId)
		} catch (error) {
			// Rollback on error
			console.error('Failed to delete comment:', error)
			setComments(previousComments)
			setCommentCount(previousCount)
		}
	}, [comments, commentCount])

	// Expose methods to parent via ref
	useImperativeHandle(ref, () => ({
		addComment,
	}), [addComment])
	return (
		<div
			className={`absolute bottom-0 left-0 right-0 bg-white rounded-t-lg shadow-2xl transition-all duration-300 ease-in-out ${
				isExpanded ? 'h-[60vh]' : 'h-auto'
			}`}
			style={{ display: 'flex', flexDirection: 'column' }}
			onClick={(e) => e.stopPropagation()}
		>
			{/* Header Bar */}
			<div className="flex items-center justify-between px-2 bg-gray-50 border-b border-gray-200 rounded-t-lg">
				<div className="flex items-center gap-2">
					<LikeButton
                        itemId={imageId}
                        itemType="Image"
                        initialLiked={initialLiked}
                        initialLikeCount={initialLikeCount}
                        variant="default"
                        onLikeChange={onLikeChange}
                    />
                    <div className='flex flex-row'>
                        <button
                            className="p-1 hover:bg-gray-200 rounded text-gray-700 hover:text-white transition-colors font-medium"
                            onClick={onOpenCommentForm}
                        >
                            <CommentIcon className="w-5 h-5 text-gray-600" />
                        </button>
                        {commentCount > 0 && (
                            <button
                                className="flex flex-row gap-2 items-center p-1 hover:bg-gray-200 rounded transition-colors"
                                onClick={onToggleExpanded}
                                aria-label={isExpanded ? 'Collapse comments' : 'Expand comments'}
                            >
                                <span className="text-sm font-medium text-gray-700">
                                    {commentCount}
                                </span>
                                <ChevronUpIcon
                                    className={`w-5 h-5 text-gray-600 transform transition-transform ${!isExpanded ? '' : 'rotate-180'}`}
                                />
                            </button>
                        )}
                    </div>
				</div>

				{authorized && (
					<div className="flex items-center gap-2">
						<AvatarButton imageId={imageId} isAvatar={isAvatar} />
						{onDeleted && <DeleteButton imageId={imageId} onDeleted={onDeleted} />}
					</div>
				)}
			</div>

			{/* Expandable Content */}
			{isExpanded && (
				<div className="flex-1 overflow-y-auto p-6">
					{loadingComments ? (
						<div className="text-center py-8 text-gray-500">Loading comments...</div>
					) : (
						<CommentList
							comments={comments}
							currentUserId={currentUserId}
							currentUserRole={currentUserRole}
							onDelete={handleDeleteComment}
						/>
					)}
				</div>
			)}
		</div>
	)
})

ImageModalMenu.displayName = 'ImageModalMenu'

export default ImageModalMenu
