'use client'

import ThreadListItem from './thread-list-item'
import type { MessageThread } from '@/app/lib/definitions/message'

type ThreadListProps = {
  threads: MessageThread[]
  selectedThreadId: string | null
  onSelect: (threadId: string) => void
}

export default function ThreadList({ threads, selectedThreadId, onSelect }: ThreadListProps) {
  if (threads.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center h-32 text-sm text-gray-400 px-4 text-center'>
        No conversations yet
      </div>
    )
  }

  return (
    <div className='flex flex-col'>
      {threads.map((thread) => (
        <ThreadListItem
          key={thread.threadId}
          thread={thread}
          isActive={thread.threadId === selectedThreadId}
          onSelect={() => onSelect(thread.threadId)}
        />
      ))}
    </div>
  )
}
