'use client'

import { useState, useRef, useCallback } from 'react'

type ComposeFormProps = {
  onSend: (text: string) => Promise<void>
  disabled?: boolean
}

export default function ComposeForm({ onSend, disabled }: ComposeFormProps) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSend = useCallback(async () => {
    const trimmed = text.trim()
    if (!trimmed || sending || disabled) return
    setSending(true)
    try {
      await onSend(trimmed)
      setText('')
      textareaRef.current?.focus()
    } finally {
      setSending(false)
    }
  }, [text, sending, disabled, onSend])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSend()
      }
    },
    [handleSend]
  )

  const canSend = text.trim().length > 0 && !sending && !disabled

  return (
    <div className='p-3 border-t border-gray-200 flex gap-2 items-end'>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder='Write a message...'
        disabled={sending || disabled}
        rows={1}
        className='flex-1 px-3 py-2 border border-gray-300 rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 placeholder:text-gray-400 max-h-32 overflow-y-auto'
        style={{ minHeight: '36px' }}
      />
      <button
        onClick={handleSend}
        disabled={!canSend}
        className='shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-blue-500 text-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors'
        aria-label='Send message'
      >
        <svg className='w-4 h-4 rotate-90' fill='currentColor' viewBox='0 0 20 20'>
          <path d='M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z' />
        </svg>
      </button>
    </div>
  )
}
