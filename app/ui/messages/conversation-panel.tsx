'use client'

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
}

export default function ConversationPanel({
  threadId,
  participant,
  onRead,
  onSent,
}: ConversationPanelProps) {
  const { user } = useUser()
  const { messages, loading, send, remove } = useConversation({
    threadId,
    onRead,
    onSent,
  })

  return (
    <div className='flex flex-col flex-1 min-h-0'>
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
      <ComposeForm onSend={send} disabled={!user} />
    </div>
  )
}
