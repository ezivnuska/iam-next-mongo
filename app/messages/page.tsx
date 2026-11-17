import type { Metadata } from 'next'
import { PageContent, PageHeader } from '@iam/ui'
import Inbox from '@/app/ui/messages/inbox'
import { getThreads } from '@/app/lib/actions/messages'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Messages',
  description: 'Your conversations',
}

export default async function MessagesPage() {
  const threads = await getThreads()
  return (
    <PageContent header={<PageHeader subtitle='Messages' />}>
      <div className='flex flex-col flex-1 min-h-0 p-4'>
        <Inbox initialThreads={threads} />
      </div>
    </PageContent>
  )
}
