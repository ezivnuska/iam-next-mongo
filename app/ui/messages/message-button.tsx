'use client'

import Link from 'next/link'
import { Button } from '@iam/ui'

type MessageButtonProps = {
  userId: string
  username: string
}

export default function MessageButton({ userId, username }: MessageButtonProps) {
  return (
    <Link href={`/messages?with=${userId}&u=${encodeURIComponent(username)}`}>
      <Button variant='outline' size='sm'>Message</Button>
    </Link>
  )
}
