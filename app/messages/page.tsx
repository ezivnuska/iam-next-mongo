import type { Metadata } from 'next'
import Inbox from '@/app/ui/messages/inbox'
import { getThreads } from '@/app/lib/actions/messages'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Messages',
  description: 'Your conversations',
}

interface Props {
  searchParams: Promise<{ with?: string; u?: string }>
}

export default async function MessagesPage({ searchParams }: Props) {
  const { with: withUserId, u: withUsername } = await searchParams
  const threads = await getThreads()

  return (
    <Inbox
      initialThreads={threads}
      withUserId={withUserId}
      withUsername={withUsername ? decodeURIComponent(withUsername) : undefined}
    />
  )
}
