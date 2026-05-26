// api/lib/socketEmit.ts
// Socket event helpers for the Hono API server.
//
// Socket.IO lives in server.js (port 3000). We emit events via an internal
// HTTP POST to http://localhost:3000/api/socket/emit.
//
// Issue events emit to `issue:{issueId}` rooms so every viewer — author,
// pledgers, bidders, and anyone else on the screen — receives updates without
// the server needing to compute a per-event audience list.
//
// Friendship / user events continue to use `user:{userId}` rooms.

const SOCKET_API = 'http://localhost:3000/api/socket/emit'

async function emitViaAPI(event: string, data: any, room?: string, excludeUserId?: string) {
  try {
    const response = await fetch(SOCKET_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data, room, excludeUserId }),
    })
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Socket emit failed: ${errorText}`)
    }
    return await response.json()
  } catch (error) {
    console.error('[api/socketEmit] error:', error)
    throw error
  }
}

// ─── Friendship events (user rooms) ─────────────────────────────────────────

export async function emitFriendRequest(payload: any) {
  await emitViaAPI('friendship:request_sent', payload, `user:${payload.recipient.id}`)
}

export async function emitFriendRequestAccepted(payload: any) {
  await emitViaAPI('friendship:request_accepted', payload, `user:${payload.userId}`)
}

export async function emitFriendRequestRejected(payload: any) {
  await emitViaAPI('friendship:request_rejected', payload, `user:${payload.userId}`)
}

export async function emitFriendshipRemoved(payload: any) {
  await emitViaAPI('friendship:removed', payload, `user:${payload.userId}`)
}

// ─── Issue events (issue rooms) ──────────────────────────────────────────────

export async function emitIssueCreated(payload: any): Promise<void> {
  // Broadcast to all — feed subscribers need to know about new issues.
  await emitViaAPI('issue:created', payload, undefined, payload.actorId)
}

export async function emitIssueApplicantAdded(payload: any): Promise<void> {
  await emitViaAPI('issue:applicant_added', payload, `issue:${payload.issueId}`)
}

export async function emitIssueApplicantRemoved(payload: any): Promise<void> {
  await emitViaAPI('issue:applicant_removed', payload, `issue:${payload.issueId}`)
}

export async function emitIssueApplicantAccepted(payload: any): Promise<void> {
  await emitViaAPI('issue:applicant_accepted', payload, `issue:${payload.issueId}`)
}

export async function emitIssueCompletionSubmitted(payload: any): Promise<void> {
  await emitViaAPI('issue:completion_submitted', payload, `issue:${payload.issueId}`)
}

export async function emitIssueCompletionReviewed(payload: any): Promise<void> {
  await emitViaAPI('issue:completion_reviewed', payload, `issue:${payload.issueId}`)
}

// Pledge events exclude the actor — they already have the update locally.
export async function emitIssuePledgeAdded(payload: any): Promise<void> {
  await emitViaAPI('issue:pledge_added', payload, `issue:${payload.issueId}`, payload.actorId)
}

export async function emitIssuePledgeRemoved(payload: any): Promise<void> {
  await emitViaAPI('issue:pledge_removed', payload, `issue:${payload.issueId}`, payload.actorId)
}
