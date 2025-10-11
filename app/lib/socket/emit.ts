// app/lib/socket/emit.ts

import { emitViaAPI } from '@/app/api/socket/io'
import { SOCKET_EVENTS } from './events'
import type {
	FriendRequestPayload,
	FriendshipStatusPayload,
	CommentPayload,
	LikePayload,
} from './events'

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
