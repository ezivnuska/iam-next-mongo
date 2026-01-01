// app/ui/content-interactions.tsx

'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
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
  autoExpandComments?: boolean
}

export default function ContentInteractions({
  itemId,
  itemType,
  initialLiked = false,
  initialLikeCount = 0,
  initialCommentCount = 0,
  autoExpandComments = false,
}: ContentInteractionsProps) {
  const { user } = useUser()
  const [showCommentForm, setShowCommentForm] = useState(false)
  const [commentsExpanded, setCommentsExpanded] = useState(autoExpandComments)
  const previousCountRef = useRef(initialCommentCount)

  const handleCommentCountChange = useCallback((count: number) => {
    const previousCount = previousCountRef.current

    // Close comments section when count reaches zero
    if (count === 0) {
      setCommentsExpanded(false)
    }
    // Expand comments section when a new comment is added
    else if (count > previousCount) {
      setCommentsExpanded(true)
    }

    previousCountRef.current = count
  }, [])

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
    currentUserId: user?.id,
    onCommentCountChange: handleCommentCountChange,
  })

  // Auto-load comments if autoExpandComments is true
  useEffect(() => {
    if (autoExpandComments && !commentsLoaded) {
      loadComments()
    }
  }, [autoExpandComments, commentsLoaded, loadComments])

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
      <div className='flex gap-2 text-sm text-gray-600'>
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
        <CommentSection
          comments={comments}
          loading={loadingComments}
          currentUserId={user?.id}
          currentUserRole={user?.role}
          onDelete={deleteComment}
        />
      )}
    </>
  )
}
