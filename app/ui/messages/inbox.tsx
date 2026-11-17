'use client'

import { useState, useEffect } from 'react'
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
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    initialThreads[0]?.threadId ?? null
  )

  // When navigating from a profile, derive and select the thread
  useEffect(() => {
    if (!withUserId || !user?.id) return
    const threadId = [user.id, withUserId].sort().join(':')
    setSelectedThreadId(threadId)
  }, [withUserId, user?.id])

  const selectedThread = threads.find((t) => t.threadId === selectedThreadId) ?? null

  // Derive the participant for the selected thread
  const participant: MessageParticipant | null = (() => {
    if (!selectedThreadId) return null
    if (selectedThread) {
      const isSelf = selectedThread.lastMessage.from.id === user?.id
      return isSelf ? selectedThread.lastMessage.to : selectedThread.lastMessage.from
    }
    // New conversation — use the params passed from the profile page
    if (withUserId && withUsername) {
      return { id: withUserId, username: withUsername, avatar: null }
    }
    return null
  })()

  const handleSelect = (threadId: string) => setSelectedThreadId(threadId)
  const handleBack = () => setSelectedThreadId(null)

  return (
    <div className='flex h-full border border-gray-200 rounded-xl overflow-hidden bg-white'>
      {/* Thread list */}
      <div
        className={`${
          selectedThreadId ? 'hidden md:flex' : 'flex'
        } flex-col w-full md:w-72 shrink-0 border-r border-gray-200 overflow-y-auto`}
      >
        <div className='px-4 py-3 border-b border-gray-200 shrink-0'>
          <h2 className='font-semibold text-gray-900 text-sm'>Messages</h2>
        </div>
        <ThreadList
          threads={threads}
          selectedThreadId={selectedThreadId}
          onSelect={handleSelect}
        />
      </div>

      {/* Conversation panel */}
      <div className={`${selectedThreadId ? 'flex' : 'hidden md:flex'} flex-col flex-1 min-w-0`}>
        {selectedThreadId && participant ? (
          <ConversationPanel
            threadId={selectedThreadId}
            participant={participant}
            onRead={() => markThreadRead(selectedThreadId)}
            onSent={refresh}
            onBack={handleBack}
          />
        ) : (
          <div className='flex-1 flex items-center justify-center text-sm text-gray-400'>
            Select a conversation
          </div>
        )}
      </div>
    </div>
  )
}
