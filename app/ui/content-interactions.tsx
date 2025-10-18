// app/ui/content-interactions.tsx

'use client'

import { useState } from 'react'
import LikeButton from '@/app/ui/like-button'
import CommentControls from '@/app/ui/comments/comment-controls'
import CommentFormModal from '@/app/ui/comments/comment-form-modal'
import CommentSection from '@/app/ui/comments/comment-section'
import { useComments } from '@/app/lib/hooks/use-comments'
import { useUser } from '@/app/lib/providers/user-provider'
import type { CommentRefType } from '@/app/lib/definitions/comment'

type ContentInteractionsProps = {
  itemId: string
  itemType: 'Image' | 'Post' | 'Memory'
  initialLiked?: boolean
  initialLikeCount?: number
  initialCommentCount?: number
}

export default function ContentInteractions({
  itemId,
  itemType,
  initialLiked = false,
  initialLikeCount = 0,
  initialCommentCount = 0,
}: ContentInteractionsProps) {
  const { user } = useUser()
  const [showCommentForm, setShowCommentForm] = useState(false)
  const [commentsExpanded, setCommentsExpanded] = useState(false)

  const {
    comments,
    commentCount,
    loadingComments,
    commentsLoaded,
    loadComments,
    deleteComment,
    createComment,
  } = useComments({
    itemId,
    itemType: itemType as CommentRefType,
    initialCommentCount,
  })

  const handleToggleComments = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!commentsExpanded && !commentsLoaded) {
      await loadComments()
    }
    setCommentsExpanded(!commentsExpanded)
  }

  const handleOpenCommentForm = (e: React.MouseEvent) => {
    e.stopPropagation()
    setShowCommentForm(true)
  }

  const handleCommentSubmit = async (content: string) => {
    await createComment(content)
    setShowCommentForm(false)
  }

  return (
    <>
      <div className="flex gap-4 text-sm text-gray-600">
        <LikeButton
          itemId={itemId}
          itemType={itemType}
          initialLiked={initialLiked}
          initialLikeCount={initialLikeCount}
        />
        <CommentControls
          commentCount={commentCount}
          isExpanded={commentsExpanded}
          onOpenCommentForm={handleOpenCommentForm}
          onToggleExpanded={handleToggleComments}
        />
      </div>

      <CommentFormModal
        isOpen={showCommentForm}
        onClose={() => setShowCommentForm(false)}
        refId={itemId}
        refType={itemType as CommentRefType}
        onSubmit={handleCommentSubmit}
      />

      {commentsExpanded && (
        <div className="mt-4 border-t border-gray-200 pt-4">
          <CommentSection
            comments={comments}
            loading={loadingComments}
            currentUserId={user?.id}
            currentUserRole={user?.role}
            onDelete={deleteComment}
          />
        </div>
      )}
    </>
  )
}
