// api/lib/socketEmit.ts
// Socket event helpers for the Hono API server.
//
// Socket.IO lives in server.js (port 3000). We emit events via an internal
// HTTP POST to http://localhost:3000/api/socket/emit — the same mechanism
// used by Next.js API routes (see app/lib/socket/emit.ts).
//
// This module is a standalone copy using relative paths so tsx can resolve
// all imports without needing tsconfig path aliases.

import Issue from '../../app/lib/models/issue'
import Pledge from '../../app/lib/models/pledge'

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

async function emitToUsers(event: string, data: any, userIds: string[]): Promise<void> {
  const unique = [...new Set(userIds.filter(Boolean))]
  await Promise.allSettled(unique.map((id) => emitViaAPI(event, data, `user:${id}`).catch(() => {})))
}

export async function getIssueAudienceIds(issueId: string, ...extra: string[]): Promise<string[]> {
  const [issue, pledgerIds] = await Promise.all([
    (Issue as any).findById(issueId, { author: 1 }).lean(),
    (Pledge as any).find({ issueId }).distinct('userId'),
  ])
  const ids = new Set<string>(extra.filter(Boolean))
  if (issue?.author) ids.add(issue.author.toString())
  for (const id of pledgerIds) ids.add(id.toString())
  return [...ids]
}

// Friendship events
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

// Issue events
export async function emitIssueCreated(payload: any): Promise<void> {
  await emitViaAPI('issue:created', payload, undefined, payload.actorId)
}

export async function emitIssueApplicantAdded(payload: any, toUserIds: string[]): Promise<void> {
  await emitToUsers('issue:applicant_added', payload, toUserIds)
}

export async function emitIssueApplicantRemoved(payload: any, toUserIds: string[]): Promise<void> {
  await emitToUsers('issue:applicant_removed', payload, toUserIds)
}

export async function emitIssueApplicantAccepted(payload: any, toUserIds: string[]): Promise<void> {
  await emitToUsers('issue:applicant_accepted', payload, toUserIds)
}

export async function emitIssueCompletionSubmitted(payload: any, toUserIds: string[]): Promise<void> {
  await emitToUsers('issue:completion_submitted', payload, toUserIds)
}

export async function emitIssueCompletionReviewed(payload: any, toUserIds: string[]): Promise<void> {
  await emitToUsers('issue:completion_reviewed', payload, toUserIds)
}

export async function emitIssuePledgeAdded(payload: any): Promise<void> {
  await emitViaAPI('issue:pledge_added', payload, undefined, payload.actorId)
}

export async function emitIssuePledgeRemoved(payload: any): Promise<void> {
  await emitViaAPI('issue:pledge_removed', payload, undefined, payload.actorId)
}
