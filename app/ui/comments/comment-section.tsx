// app/ui/comments/comment-section.tsx

'use client'

import CommentList from '@/app/ui/comments/comment-list'
import type { Comment } from '@/app/lib/definitions/comment'
import { useIsDark } from '@/app/lib/hooks/use-is-dark'
import { getSecondaryTextColor } from '@/app/lib/utils/theme-colors'

type CommentSectionProps = {
  comments: Comment[]
  loading: boolean
  currentUserId?: string
  currentUserRole?: string
  onDelete?: (commentId: string) => void
  emptyMessage?: string
  loadingMessage?: string
  className?: string
}

export default function CommentSection({
  comments,
  loading,
  currentUserId,
  currentUserRole,
  onDelete,
  emptyMessage = 'No comments yet. Be the first to comment!',
  loadingMessage = 'Loading comments...',
  className = '',
}: CommentSectionProps) {
  const isDark = useIsDark();

  if (loading) {
    return (
      <div className={`text-center py-4 ${className}`} style={{ color: getSecondaryTextColor(isDark) }}>
        {loadingMessage}
      </div>
    )
  }

  if (comments.length === 0) {
    return (
      <div className={`text-center py-4 ${className}`} style={{ color: getSecondaryTextColor(isDark) }}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div className={className}>
      <CommentList
        comments={comments}
        currentUserId={currentUserId}
        currentUserRole={currentUserRole}
        onDelete={onDelete}
      />
    </div>
  )
}
