// app/ui/comments/comment-form-modal.tsx

'use client'

import Modal from '@/app/ui/modal'
import CommentForm from '@/app/ui/comments/comment-form'
import type { CommentRefType } from '@/app/lib/definitions/comment'

type CommentFormModalProps = {
  isOpen: boolean
  onClose: () => void
  refId: string
  refType: CommentRefType
  onSubmit: (content: string) => void | Promise<void>
  title?: string
}

export default function CommentFormModal({
  isOpen,
  onClose,
  refId,
  refType,
  onSubmit,
  title = 'Add Comment',
}: CommentFormModalProps) {
  if (!isOpen) return null

  return (
    <Modal
      onClose={onClose}
      position="absolute"
      className="bg-black bg-opacity-50"
      contentClassName="bg-white rounded-lg p-6 max-w-lg w-full mx-4"
      showCloseButton
    >
      <h3 className="text-lg font-semibold mb-4">{title}</h3>
      <CommentForm
        refId={refId}
        refType={refType}
        onSubmit={onSubmit}
      />
    </Modal>
  )
}
