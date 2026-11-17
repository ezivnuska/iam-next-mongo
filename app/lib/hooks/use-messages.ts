'use client'

import { useState, useCallback } from 'react'
import { useSocket } from '@/app/lib/providers/socket-provider'
import { useSocketListener } from './use-socket-listener'
import { SOCKET_EVENTS } from '@/app/lib/socket/events'
import { getThreads } from '@/app/lib/actions/messages'
import type { MessageThread } from '@/app/lib/definitions/message'
import type { MessageSentPayload, MessageDeletedPayload } from '@/app/lib/socket/events'

type UseMessagesOptions = {
  initialThreads?: MessageThread[]
}

export function useMessages({ initialThreads = [] }: UseMessagesOptions = {}) {
  const { socket } = useSocket()
  const [threads, setThreads] = useState<MessageThread[]>(initialThreads)
  const [loading, setLoading] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const fresh = await getThreads()
      setThreads(fresh)
    } finally {
      setLoading(false)
    }
  }, [])

  const markThreadRead = useCallback((threadId: string) => {
    setThreads((prev) =>
      prev.map((t) => (t.threadId === threadId ? { ...t, unreadCount: 0 } : t))
    )
  }, [])

  // New message from another user — bump thread to top and increment unread
  useSocketListener<MessageSentPayload>(socket, SOCKET_EVENTS.MESSAGE_SENT, (payload) => {
    setThreads((prev) => {
      const existing = prev.find((t) => t.threadId === payload.threadId)
      if (!existing) {
        // Unfamiliar thread (first message from this person) — refresh to get full data
        refresh()
        return prev
      }
      const updated: MessageThread = {
        ...existing,
        unreadCount: existing.unreadCount + 1,
      }
      return [updated, ...prev.filter((t) => t.threadId !== payload.threadId)]
    })
  })

  // Message deleted — refresh so lastMessage stays accurate
  useSocketListener<MessageDeletedPayload>(socket, SOCKET_EVENTS.MESSAGE_DELETED, () => {
    refresh()
  })

  return { threads, loading, refresh, markThreadRead }
}
