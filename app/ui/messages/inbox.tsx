'use client'

import { useState } from 'react'
import { useMessages } from '@/app/lib/hooks/use-messages'
import ThreadList from './thread-list'
import ConversationPanel from './conversation-panel'
import type { MessageThread } from '@/app/lib/definitions/message'

type InboxProps = {
  initialThreads: MessageThread[]
}

export default function Inbox({ initialThreads }: InboxProps) {
  const { threads, markThreadRead } = useMessages({ initialThreads })
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
    initialThreads[0]?.threadId ?? null
  )

  const selectedThread = threads.find((t) => t.threadId === selectedThreadId) ?? null

  const handleSelect = (threadId: string) => {
    setSelectedThreadId(threadId)
  }

  const handleBack = () => {
    setSelectedThreadId(null)
  }

  return (
    <div className='flex h-full border border-gray-200 rounded-xl overflow-hidden bg-white'>
      {/* Thread list — full width on mobile when no thread selected, sidebar on desktop */}
      <div
        className={`${
          selectedThread ? 'hidden md:flex' : 'flex'
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
      <div className={`${selectedThread ? 'flex' : 'hidden md:flex'} flex-col flex-1 min-w-0`}>
        {selectedThread ? (
          <ConversationPanel
            thread={selectedThread}
            onRead={() => markThreadRead(selectedThread.threadId)}
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
