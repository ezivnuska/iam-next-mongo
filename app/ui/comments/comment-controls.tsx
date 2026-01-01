// app/ui/comments/comment-controls.tsx

'use client'

import { CommentIcon, ChevronUpIcon } from '@/app/ui/icons'

type CommentControlsProps = {
  commentCount: number
  isExpanded: boolean
  onOpenCommentForm: (e: React.MouseEvent) => void
  onToggleExpanded?: (e: React.MouseEvent) => void
  variant?: 'default' | 'compact'
  className?: string
}

export default function CommentControls({
  commentCount,
  isExpanded,
  onOpenCommentForm,
  onToggleExpanded,
  variant = 'default',
  className = '',
}: CommentControlsProps) {
  const baseClassName = variant === 'compact'
    ? 'flex flex-row items-center gap-1'
    : 'flex flex-row items-center'

  return (
    <div className={`${baseClassName} ${className}`}>
      <button
        className='p-1 text-gray-600 hover:text-blue-300 transition-colors'
        onClick={onOpenCommentForm}
        aria-label='Add comment'
      >
        <CommentIcon className='w-5 h-5' />
      </button>
      {commentCount > 0 && onToggleExpanded && (
        <button
          className='flex flex-row gap-1 items-center p-1 text-gray-700 hover:text-blue-300 transition-colors'
          onClick={onToggleExpanded}
          aria-label={isExpanded ? 'Collapse comments' : 'Expand comments'}
        >
          <span className='text-sm font-medium'>
            {commentCount}
          </span>
          <ChevronUpIcon
            className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>
      )}
    </div>
  )
}
