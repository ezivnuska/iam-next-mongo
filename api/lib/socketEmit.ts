// api/lib/socketEmit.ts
// Socket event helpers for Hono mobile API routes.
//
// When the Hono app runs inside the Next.js custom server (server.ts),
// global.io is available and events are emitted directly — no HTTP hop.
//
// When running standalone (api/index.ts), global.io is absent and events
// fall back to the internal HTTP bridge at localhost:3000/api/socket/emit.
//
// Issue events emit to `issue:{issueId}` rooms so every viewer receives
// updates without the server computing a per-event audience list.

const SOCKET_API = `http://localhost:${process.env.PORT ?? '3000'}/api/socket/emit`

async function emit(event: string, data: any, room?: string, excludeUserId?: string) {
  const io = (global as any).io

  if (!io) {
    const res = await fetch(SOCKET_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': process.env.INTERNAL_SECRET ?? '',
      },
      body: JSON.stringify({ event, data, room, excludeUserId }),
    })
    if (!res.ok) throw new Error(`Socket bridge error: ${await res.text()}`)
    return
  }

  if (excludeUserId) {
    const sockets = await io.fetchSockets()
    for (const socket of sockets) {
      if (socket.userId !== excludeUserId) {
        if (!room || socket.rooms.has(room)) socket.emit(event, data)
      }
    }
  } else if (room) {
    io.to(room).emit(event, data)
  } else {
    io.emit(event, data)
  }
}

// ─── Friendship events ───────────────────────────────────────────────────────

export async function emitFriendRequest(payload: any) {
  await emit('friendship:request_sent', payload, `user:${payload.recipient.id}`)
}

export async function emitFriendRequestAccepted(payload: any) {
  await emit('friendship:request_accepted', payload, `user:${payload.userId}`)
}

export async function emitFriendRequestRejected(payload: any) {
  await emit('friendship:request_rejected', payload, `user:${payload.userId}`)
}

export async function emitFriendshipRemoved(payload: any) {
  await emit('friendship:removed', payload, `user:${payload.userId}`)
}

// ─── Issue events ────────────────────────────────────────────────────────────

export async function emitIssueCreated(payload: any): Promise<void> {
  await emit('issue:created', payload, undefined, payload.actorId)
}

export async function emitIssueApplicantAdded(payload: any): Promise<void> {
  await emit('issue:applicant_added', payload, `issue:${payload.issueId}`)
}

export async function emitIssueApplicantRemoved(payload: any): Promise<void> {
  await emit('issue:applicant_removed', payload, `issue:${payload.issueId}`)
}

export async function emitIssueApplicantAccepted(payload: any): Promise<void> {
  await emit('issue:applicant_accepted', payload, `issue:${payload.issueId}`)
}

export async function emitIssueCompletionSubmitted(payload: any): Promise<void> {
  await emit('issue:completion_submitted', payload, `issue:${payload.issueId}`)
}

export async function emitIssueCompletionReviewed(payload: any): Promise<void> {
  await emit('issue:completion_reviewed', payload, `issue:${payload.issueId}`)
}

export async function emitIssueReviewSubmitted(payload: any): Promise<void> {
  await emit('issue:review_submitted', payload, `issue:${payload.issueId}`, payload.actorId)
}

export async function emitIssuePledgeAdded(payload: any): Promise<void> {
  await emit('issue:pledge_added', payload, `issue:${payload.issueId}`, payload.actorId)
}

export async function emitIssuePledgeRemoved(payload: any): Promise<void> {
  await emit('issue:pledge_removed', payload, `issue:${payload.issueId}`, payload.actorId)
}

export async function emitIssueAllocationUpdated(payload: { issueId: string; totalAllocated: number; generalPoolShare: number }): Promise<void> {
  await emit('issue:allocation_updated', payload, `issue:${payload.issueId}`)
}

export async function emitPoolUpdated(payload: { sharePerIssue: number }): Promise<void> {
  await emit('pool:updated', payload)
}
