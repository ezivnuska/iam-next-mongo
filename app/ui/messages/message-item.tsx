'use client'

import { useState } from 'react'
import { UserAvatar } from '@iam/ui'
import { formatRelativeTime } from '@/app/lib/utils/format-date'
import type { Message } from '@/app/lib/definitions/message'

type MessageItemProps = {
  message: Message
  isSelf: boolean
  onDelete?: (messageId: string) => void
}

export default function MessageItem({ message, isSelf, onDelete }: MessageItemProps) {
  const [hovered, setHovered] = useState(false)

  const avatarUrl = message.from.avatar?.variants.find((v) => v.size === 'small')?.url

  if (isSelf) {
    return (
      <div
        className='flex gap-2 justify-end group'
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {onDelete && (
          <div className={`self-center transition-opacity ${hovered ? 'opacity-100' : 'opacity-0'}`}>
            <button
              onClick={() => onDelete(message.id)}
              className='p-1 text-gray-400 hover:text-red-500 transition-colors'
              aria-label='Delete message'
            >
              <svg className='w-4 h-4' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2}
                  d='M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16' />
              </svg>
            </button>
          </div>
        )}
        <div className='flex flex-col max-w-[72%] items-end'>
          <div className='px-3 py-2 rounded-2xl rounded-br-sm text-sm break-words bg-blue-500 text-white'>
            {message.text}
          </div>
          <span className='text-xs text-gray-400 mt-1 mr-1'>{formatRelativeTime(message.createdAt)}</span>
        </div>
      </div>
    )
  }

  return (
    <div className='flex gap-2 group max-w-[72%]'>
      <div className='w-7 h-7 shrink-0'>
        <UserAvatar username={message.from.username} avatarUrl={avatarUrl} size={28} />
      </div>
      <div className='flex flex-col min-w-0'>
        <div className='flex items-baseline gap-2 mb-1'>
          <span className='text-xs font-medium text-gray-700'>{message.from.username}</span>
          <span className='text-xs text-gray-400'>{formatRelativeTime(message.createdAt)}</span>
        </div>
        <div className='px-3 py-2 rounded-2xl rounded-bl-sm text-sm break-words bg-gray-100 text-gray-900'>
          {message.text}
        </div>
      </div>
    </div>
  )
}
