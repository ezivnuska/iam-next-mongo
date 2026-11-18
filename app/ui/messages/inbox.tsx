'use client'

import { useState, useEffect } from 'react'
import { PageContent, PageHeader, UserAvatar } from '@iam/ui'
import { useUser } from '@/app/lib/providers/user-provider'
import { useMessages } from '@/app/lib/hooks/use-messages'
import ThreadList from './thread-list'
import ConversationPanel from './conversation-panel'
import type { MessageThread, MessageParticipant } from '@/app/lib/definitions/message'

type InboxProps = {
  initialThreads: MessageThread[]
  withUserId?: string
  withUsername?: string
}

export default function Inbox({ initialThreads, withUserId, withUsername }: InboxProps) {
  const { user } = useUser()
  const { threads, markThreadRead, refresh } = useMessages({ initialThreads })
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null)

  useEffect(() => {
    if (!withUserId || !user?.id) return
    const threadId = [user.id, withUserId].sort().join(':')
    setSelectedThreadId(threadId)
  }, [withUserId, user?.id])

  const selectedThread = threads.find((t) => t.threadId === selectedThreadId) ?? null

  const participant: MessageParticipant | null = (() => {
    if (!selectedThreadId) return null
    if (selectedThread) {
      const isSelf = selectedThread.lastMessage.from.id === user?.id
      return isSelf ? selectedThread.lastMessage.to : selectedThread.lastMessage.from
    }
    if (withUserId && withUsername) {
      return { id: withUserId, username: withUsername, avatar: null }
    }
    return null
  })()

  const handleSelect = (threadId: string) => setSelectedThreadId(threadId)
  const handleBack = () => setSelectedThreadId(null)

  const avatarUrl = participant?.avatar?.variants.find((v) => v.size === 'small')?.url

  const header = selectedThreadId && participant ? (
    <div className='flex items-center gap-3 px-4 py-3 border-b border-gray-200'>
      <button
        onClick={handleBack}
        className='p-1 text-gray-500 hover:text-gray-900 transition-colors'
        aria-label='Back to inbox'
      >
        <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 19l-7-7 7-7' />
        </svg>
      </button>
      <div className='w-8 h-8'>
        <UserAvatar username={participant.username} avatarUrl={avatarUrl} size={32} />
      </div>
      <span className='font-semibold text-gray-900 text-sm'>{participant.username}</span>
    </div>
  ) : (
    <PageHeader subtitle='Messages' />
  )

  return (
    <PageContent header={header} scrollable={!selectedThreadId}>
      {selectedThreadId && participant ? (
        <ConversationPanel
          threadId={selectedThreadId}
          participant={participant}
          onRead={() => markThreadRead(selectedThreadId)}
          onSent={refresh}
        />
      ) : (
        <ThreadList
          threads={threads}
          selectedThreadId={selectedThreadId}
          onSelect={handleSelect}
        />
      )}
    </PageContent>
  )
}
