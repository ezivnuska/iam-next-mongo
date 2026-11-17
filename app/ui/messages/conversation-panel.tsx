'use client'

import { UserAvatar } from '@iam/ui'
import { useUser } from '@/app/lib/providers/user-provider'
import { useConversation } from '@/app/lib/hooks/use-conversation'
import MessageList from './message-list'
import ComposeForm from './compose-form'
import type { MessageParticipant } from '@/app/lib/definitions/message'

type ConversationPanelProps = {
  threadId: string
  participant: MessageParticipant
  onRead: () => void
  onSent?: () => void
  onBack?: () => void
}

export default function ConversationPanel({
  threadId,
  participant,
  onRead,
  onSent,
  onBack,
}: ConversationPanelProps) {
  const { user } = useUser()
  const { messages, loading, send, remove } = useConversation({
    threadId,
    onRead,
    onSent,
  })

  const avatarUrl = participant.avatar?.variants.find((v) => v.size === 'small')?.url

  return (
    <div className='flex flex-col h-full min-h-0'>
      {/* Header */}
      <div className='flex items-center gap-3 px-4 py-3 border-b border-gray-200 shrink-0'>
        {onBack && (
          <button
            onClick={onBack}
            className='mr-1 p-1 text-gray-500 hover:text-gray-900 transition-colors md:hidden'
            aria-label='Back to inbox'
          >
            <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
            </svg>
          </button>
        )}
        <div className='w-8 h-8'>
          <UserAvatar username={participant.username} avatarUrl={avatarUrl} size={32} />
        </div>
        <span className='font-semibold text-gray-900 text-sm'>{participant.username}</span>
      </div>

      {/* Messages */}
      {loading ? (
        <div className='flex-1 flex items-center justify-center text-sm text-gray-400'>
          Loading...
        </div>
      ) : (
        <MessageList
          messages={messages}
          currentUserId={user?.id ?? ''}
          onDelete={remove}
        />
      )}

      {/* Compose */}
      <ComposeForm onSend={send} disabled={!user} />
    </div>
  )
}
