'use client'

import { useEffect } from 'react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Server action IDs change on every deployment. If the client has a stale
    // page cached from a previous build, Next.js throws this error when it
    // tries to invoke an action that no longer exists. Reloading fetches the
    // current build and resolves it automatically.
    if (error.message?.includes('Failed to find Server Action')) {
      window.location.reload()
    }
  }, [error])

  return (
    <html>
      <body>
        <div style={{ padding: 32, fontFamily: 'sans-serif' }}>
          <h2>Something went wrong</h2>
          <button onClick={reset}>Try again</button>
        </div>
      </body>
    </html>
  )
}
