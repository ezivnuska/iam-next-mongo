// app/ui/image-modal-menu.tsx

'use client'

import { useEffect, forwardRef, useImperativeHandle } from 'react'
import CommentControls from '@/app/ui/comments/comment-controls'
import CommentSection from '@/app/ui/comments/comment-section'
import LikeButton from '@/app/ui/like-button'
import DeleteButtonWithConfirm from '@/app/ui/delete-button-with-confirm'
import AvatarButton from '@/app/ui/user/set-avatar-button'
import { useComments } from '@/app/lib/hooks/use-comments'
import { useUser } from '@/app/lib/providers/user-provider'
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
	onAvatarChange?: (newAvatarId: string | null) => void
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
	onAvatarChange,
}, ref) => {
	const { user, setUser } = useUser()

	const {
		comments,
		commentCount,
		loadingComments,
		commentsLoaded,
		loadComments,
		addComment,
		deleteComment,
		resetComments,
	} = useComments({
		itemId: imageId,
		itemType: 'Image',
		initialCommentCount,
		onCommentCountChange,
		currentUserId: currentUserId || user?.id,
	})

	// Load comments when expanded
	useEffect(() => {
		if (imageId && isExpanded && !commentsLoaded) {
			loadComments()
		}
	}, [imageId, isExpanded, commentsLoaded, loadComments])

	// Reset comments when image changes
	useEffect(() => {
		resetComments()
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [imageId])

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
					<CommentControls
						commentCount={commentCount}
						isExpanded={isExpanded}
						onOpenCommentForm={onOpenCommentForm}
						onToggleExpanded={onToggleExpanded}
					/>
				</div>

				{authorized && (
					<div className="flex items-center gap-2">
						<AvatarButton imageId={imageId} isAvatar={isAvatar} onAvatarChange={onAvatarChange} />
						{onDeleted && (
							<DeleteButtonWithConfirm
								onDelete={async () => {
									const res = await fetch(`/api/images/${imageId}`, { method: "DELETE" });
									if (!res.ok) throw new Error("Failed to delete image");

									// If this was the user's avatar, update user context
									if (user?.avatar?.id === imageId) {
										setUser({ ...user, avatar: null });
									}

									onDeleted();
								}}
							/>
						)}
					</div>
				)}
			</div>

			{/* Expandable Content */}
			{isExpanded && (
				<div className="flex-1 overflow-y-auto p-6">
					<CommentSection
						comments={comments}
						loading={loadingComments}
						currentUserId={currentUserId}
						currentUserRole={currentUserRole}
						onDelete={deleteComment}
						loadingMessage="Loading comments..."
					/>
				</div>
			)}
		</div>
	)
})

ImageModalMenu.displayName = 'ImageModalMenu'

export default ImageModalMenu
