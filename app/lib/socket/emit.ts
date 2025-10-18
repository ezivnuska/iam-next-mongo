// app/lib/socket/emit.ts

import { emitViaAPI } from '@/app/api/socket/io'
import { SOCKET_EVENTS } from './events'
import type {
	FriendRequestPayload,
	FriendshipStatusPayload,
	CommentPayload,
	LikePayload,
	ActivityPayload,
	PokerPlayerPayload,
	PokerDealPayload,
	PokerBetPayload,
	PokerRaisePayload,
	PokerFoldPayload,
	PokerTurnPayload,
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

export async function emitActivityCreated(payload: ActivityPayload) {
	await emitViaAPI(SOCKET_EVENTS.ACTIVITY_CREATED, payload)
}

// Poker event emitters
export async function emitPokerPlayerJoined(payload: PokerPlayerPayload) {
	await emitViaAPI(SOCKET_EVENTS.POKER_PLAYER_JOINED, payload)
}

export async function emitPokerPlayerLeft(payload: PokerPlayerPayload) {
	await emitViaAPI(SOCKET_EVENTS.POKER_PLAYER_LEFT, payload)
}

export async function emitPokerDeal(payload: PokerDealPayload) {
	await emitViaAPI(SOCKET_EVENTS.POKER_DEAL, payload)
}

export async function emitPokerBet(payload: PokerBetPayload) {
	await emitViaAPI(SOCKET_EVENTS.POKER_BET, payload)
}

export async function emitPokerRaise(payload: PokerRaisePayload) {
	await emitViaAPI(SOCKET_EVENTS.POKER_RAISE, payload)
}

export async function emitPokerFold(payload: PokerFoldPayload) {
	await emitViaAPI(SOCKET_EVENTS.POKER_FOLD, payload)
}

export async function emitPokerTurnChanged(payload: PokerTurnPayload) {
	await emitViaAPI(SOCKET_EVENTS.POKER_TURN_CHANGED, payload)
}

export async function emitPokerGameRestarted() {
	await emitViaAPI(SOCKET_EVENTS.POKER_GAME_RESTARTED, {})
}
