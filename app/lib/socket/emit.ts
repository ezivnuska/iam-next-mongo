// app/lib/socket/emit.ts

import { emitViaAPI } from '@/app/api/socket/io'
import { SOCKET_EVENTS } from './events'
import type {
	FriendRequestPayload,
	FriendshipStatusPayload,
	CommentPayload,
	LikePayload,
	ActivityPayload,
	NeedApplicantPayload,
	NeedApplicantRemovedPayload,
	NeedCompletionPayload,
	NeedPledgePayload,
	NeedPledgeRemovedPayload,
} from './events'
import Issue from '@/app/lib/models/issue'
import Pledge from '@/app/lib/models/pledge'

async function emitToUsers(event: string, data: any, userIds: string[]): Promise<void> {
	const unique = [...new Set(userIds.filter(Boolean))]
	await Promise.allSettled(unique.map((id) => emitViaAPI(event, data, `user:${id}`).catch(() => {})))
}

export async function getNeedAudienceIds(needId: string, ...extra: string[]): Promise<string[]> {
	const [need, pledgerIds] = await Promise.all([
		(Issue as any).findById(needId, { author: 1 }).lean(),
		(Pledge as any).find({ issueId: needId }).distinct('userId'),
	])
	const ids = new Set<string>(extra.filter(Boolean))
	if (need?.author) ids.add(need.author.toString())
	for (const id of pledgerIds) ids.add(id.toString())
	return [...ids]
}

export async function emitFriendRequest(payload: FriendRequestPayload) {
	await emitViaAPI(SOCKET_EVENTS.FRIEND_REQUEST_SENT, payload, `user:${payload.recipient.id}`)
}

export async function emitFriendRequestAccepted(payload: FriendshipStatusPayload) {
	await emitViaAPI(SOCKET_EVENTS.FRIEND_REQUEST_ACCEPTED, payload, `user:${payload.userId}`)
}

export async function emitFriendRequestRejected(payload: FriendshipStatusPayload) {
	await emitViaAPI(SOCKET_EVENTS.FRIEND_REQUEST_REJECTED, payload, `user:${payload.userId}`)
}

export async function emitFriendshipRemoved(payload: FriendshipStatusPayload) {
	await emitViaAPI(SOCKET_EVENTS.FRIENDSHIP_REMOVED, payload, `user:${payload.userId}`)
}

export async function emitCommentAdded(payload: CommentPayload) {
	await emitViaAPI(SOCKET_EVENTS.COMMENT_ADDED, payload)
}

export async function emitCommentDeleted(payload: CommentPayload) {
	await emitViaAPI(SOCKET_EVENTS.COMMENT_DELETED, payload)
}

export async function emitLikeAdded(payload: LikePayload) {
	await emitViaAPI(SOCKET_EVENTS.LIKE_ADDED, payload)
}

export async function emitLikeRemoved(payload: LikePayload) {
	await emitViaAPI(SOCKET_EVENTS.LIKE_REMOVED, payload)
}

export async function emitActivityCreated(payload: ActivityPayload) {
	await emitViaAPI(SOCKET_EVENTS.ACTIVITY_CREATED, payload)
}

export async function emitNeedApplicantAdded(payload: NeedApplicantPayload, toUserIds: string[]): Promise<void> {
	await emitToUsers(SOCKET_EVENTS.NEED_APPLICANT_ADDED, payload, toUserIds)
}

export async function emitNeedApplicantRemoved(payload: NeedApplicantRemovedPayload, toUserIds: string[]): Promise<void> {
	await emitToUsers(SOCKET_EVENTS.NEED_APPLICANT_REMOVED, payload, toUserIds)
}

export async function emitNeedApplicantVoted(payload: NeedApplicantPayload, toUserIds: string[]): Promise<void> {
	await emitToUsers(SOCKET_EVENTS.NEED_APPLICANT_VOTED, payload, toUserIds)
}

export async function emitNeedApplicantAccepted(payload: NeedApplicantPayload, toUserIds: string[]): Promise<void> {
	await emitToUsers(SOCKET_EVENTS.NEED_APPLICANT_ACCEPTED, payload, toUserIds)
}

export async function emitNeedCompletionSubmitted(payload: NeedCompletionPayload, toUserIds: string[]): Promise<void> {
	await emitToUsers(SOCKET_EVENTS.NEED_COMPLETION_SUBMITTED, payload, toUserIds)
}

export async function emitNeedCompletionReviewed(payload: NeedCompletionPayload, toUserIds: string[]): Promise<void> {
	await emitToUsers(SOCKET_EVENTS.NEED_COMPLETION_REVIEWED, payload, toUserIds)
}

export async function emitNeedPledgeAdded(payload: NeedPledgePayload, toUserIds: string[]): Promise<void> {
	await emitToUsers(SOCKET_EVENTS.NEED_PLEDGE_ADDED, payload, toUserIds)
}

export async function emitNeedPledgeRemoved(payload: NeedPledgeRemovedPayload, toUserIds: string[]): Promise<void> {
	await emitToUsers(SOCKET_EVENTS.NEED_PLEDGE_REMOVED, payload, toUserIds)
}

// Note: Poker events are now handled by PokerSocketEmitter in socket-helper.ts
