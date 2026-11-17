'use client'

import { useEffect, useRef } from 'react'
import MessageItem from './message-item'
import type { Message } from '@/app/lib/definitions/message'

type MessageListProps = {
  messages: Message[]
  currentUserId: string
  onDelete?: (messageId: string) => void
}

export default function MessageList({ messages, currentUserId, onDelete }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (messages.length === 0) {
    return (
      <div className='flex-1 flex items-center justify-center text-sm text-gray-400'>
        No messages yet. Say hello!
      </div>
    )
  }

  return (
    <div className='flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3'>
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          isSelf={message.from.id === currentUserId}
          onDelete={onDelete}
        />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
