'use client'

import { UserAvatar } from '@iam/ui'
import { formatRelativeTime } from '@/app/lib/utils/format-date'
import { useUser } from '@/app/lib/providers/user-provider'
import type { MessageThread } from '@/app/lib/definitions/message'

type ThreadListItemProps = {
  thread: MessageThread
  isActive: boolean
  onSelect: () => void
}

export default function ThreadListItem({ thread, isActive, onSelect }: ThreadListItemProps) {
  const { user } = useUser()
  const { lastMessage, unreadCount } = thread

  const isSelf = lastMessage.from.id === user?.id
  const participant = isSelf ? lastMessage.to : lastMessage.from
  const avatarUrl = participant.avatar?.variants.find((v) => v.size === 'small')?.url

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 ${
        isActive ? 'bg-blue-50 border-l-2 border-blue-500' : 'border-l-2 border-transparent'
      }`}
    >
      <div className='w-10 h-10 shrink-0'>
        <UserAvatar username={participant.username} avatarUrl={avatarUrl} size={40} />
      </div>

      <div className='flex-1 min-w-0'>
        <div className='flex items-center justify-between gap-2 mb-0.5'>
          <span
            className={`text-sm truncate ${
              unreadCount > 0 ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
            }`}
          >
            {participant.username}
          </span>
          <span className='text-xs text-gray-400 shrink-0'>
            {formatRelativeTime(lastMessage.createdAt)}
          </span>
        </div>

        <div className='flex items-center justify-between gap-2'>
          <p
            className={`text-xs truncate ${
              unreadCount > 0 ? 'text-gray-800' : 'text-gray-500'
            }`}
          >
            {isSelf ? `You: ${lastMessage.text}` : lastMessage.text}
          </p>
          {unreadCount > 0 && (
            <span className='shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-blue-500 text-white text-xs font-semibold'>
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
