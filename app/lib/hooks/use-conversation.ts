'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { useSocket } from '@/app/lib/providers/socket-provider'
import { useSocketListener } from './use-socket-listener'
import { SOCKET_EVENTS } from '@/app/lib/socket/events'
import {
  getThreadMessages,
  sendMessage as sendAction,
  markMessageRead,
  deleteMessage as deleteAction,
} from '@/app/lib/actions/messages'
import { useUser } from '@/app/lib/providers/user-provider'
import type { Message } from '@/app/lib/definitions/message'
import type { MessageSentPayload, MessageDeletedPayload } from '@/app/lib/socket/events'

type UseConversationOptions = {
  threadId: string
  onRead?: () => void
  onSent?: () => void
}

export function useConversation({ threadId, onRead, onSent }: UseConversationOptions) {
  const { socket } = useSocket()
  const { user } = useUser()
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const threadIdRef = useRef(threadId)
  const markedReadRef = useRef(false)
  const onReadRef = useRef(onRead)
  const onSentRef = useRef(onSent)

  useEffect(() => { threadIdRef.current = threadId }, [threadId])
  useEffect(() => { onReadRef.current = onRead }, [onRead])
  useEffect(() => { onSentRef.current = onSent }, [onSent])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const { messages: msgs } = await getThreadMessages(threadId)
      // Server returns newest-first; display oldest-first
      setMessages(msgs.reverse())
      setLoaded(true)
    } finally {
      setLoading(false)
    }
  }, [threadId])

  // Reset and reload when thread changes
  useEffect(() => {
    setMessages([])
    setLoaded(false)
    markedReadRef.current = false
    load()
  }, [threadId, load])

  // Auto-mark unread messages as read once after initial load
  useEffect(() => {
    if (!loaded || !user?.id || markedReadRef.current) return
    markedReadRef.current = true
    const unread = messages.filter((m) => m.to.id === user.id && !m.readAt)
    if (unread.length === 0) return
    unread.forEach((m) => markMessageRead(m.id).catch(() => {}))
    onReadRef.current?.()
  }, [loaded, messages, user?.id])

  const send = useCallback(async (text: string) => {
    if (!text.trim() || sending) return
    setSending(true)
    try {
      const message = await sendAction(
        threadIdRef.current.split(':').find((id) => id !== user?.id) ?? '',
        text.trim()
      )
      setMessages((prev) => [...prev, message])
      onSentRef.current?.()
    } finally {
      setSending(false)
    }
  }, [sending, user?.id])

  const remove = useCallback(async (messageId: string) => {
    setMessages((prev) => prev.filter((m) => m.id !== messageId))
    try {
      await deleteAction(messageId)
    } catch {
      load()
    }
  }, [load])

  // Incoming message from the other participant — reload to get full populated data
  useSocketListener<MessageSentPayload>(socket, SOCKET_EVENTS.MESSAGE_SENT, (payload) => {
    if (payload.threadId !== threadIdRef.current) return
    load()
  })

  // Message deleted by the other participant
  useSocketListener<MessageDeletedPayload>(socket, SOCKET_EVENTS.MESSAGE_DELETED, (payload) => {
    if (payload.threadId !== threadIdRef.current) return
    setMessages((prev) => prev.filter((m) => m.id !== payload.messageId))
  })

  return { messages, loading, sending, loaded, send, remove }
}
