'use client'

import Link from 'next/link'

type MessageButtonProps = {
  userId: string
  username: string
}

function EnvelopeIcon({ className }: { className?: string }) {
  return (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='1.5' strokeLinecap='round' strokeLinejoin='round' className={className}>
      <rect x='2' y='5' width='20' height='14' rx='2' />
      <polyline points='2,5 12,13 22,5' />
    </svg>
  )
}

export default function MessageButton({ userId, username }: MessageButtonProps) {
  return (
    <Link
      href={`/messages?with=${userId}&u=${encodeURIComponent(username)}`}
      title='Send message'
      className='flex items-center justify-center w-9 h-9 rounded-lg border border-gray-300 hover:border-gray-400 text-gray-500 hover:text-gray-900 transition-colors'
    >
      <EnvelopeIcon className='w-6 h-6' />
    </Link>
  )
}
