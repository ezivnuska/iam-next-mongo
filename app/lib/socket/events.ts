// app/lib/socket/events.ts

export const SOCKET_EVENTS = {
	// Connection events
	CONNECTION: 'connection',
	DISCONNECT: 'disconnect',

	// User events
	USER_ONLINE: 'user:online',
	USER_OFFLINE: 'user:offline',

	// Friendship events
	FRIEND_REQUEST_SENT: 'friendship:request_sent',
	FRIEND_REQUEST_ACCEPTED: 'friendship:request_accepted',
	FRIEND_REQUEST_REJECTED: 'friendship:request_rejected',
	FRIENDSHIP_REMOVED: 'friendship:removed',

	// Comment events
	COMMENT_ADDED: 'comment:added',
	COMMENT_DELETED: 'comment:deleted',

	// Like events
	LIKE_ADDED: 'like:added',
	LIKE_REMOVED: 'like:removed',

	// Activity events
	ACTIVITY_CREATED: 'activity:created',

	// Poker events
	POKER_PLAYER_JOINED: 'poker:player_joined',
	POKER_PLAYER_LEFT: 'poker:player_left',
	POKER_DEAL: 'poker:deal',
	POKER_BET: 'poker:bet',
	POKER_RAISE: 'poker:raise',
	POKER_FOLD: 'poker:fold',
	POKER_TURN_CHANGED: 'poker:turn_changed',
	POKER_GAME_RESTARTED: 'poker:game_restarted',
	POKER_STATE_UPDATE: 'poker:state_update',
	POKER_GAME_CREATED: 'poker:game_created',
	POKER_GAME_DELETED: 'poker:game_deleted',
} as const

export type SocketEventType = typeof SOCKET_EVENTS[keyof typeof SOCKET_EVENTS]

// Event payload types
export interface FriendRequestPayload {
	friendshipId: string
	requester: {
		id: string
		username: string
	}
	recipient: {
		id: string
		username: string
	}
}

export interface FriendshipStatusPayload {
	friendshipId: string
	userId: string // The user receiving this event
	username: string
	otherUserId: string // The other user in the friendship
}

export interface CommentPayload {
	commentId: string
	refId: string
	refType: 'Image' | 'Post' | 'Memory'
	author: {
		id: string
		username: string
	}
}

export interface LikePayload {
	itemId: string
	itemType: 'Image' | 'Post' | 'Memory'
	userId: string
	username: string
}

export interface ActivityPayload {
	activityId: string
	userId: string
	action: 'create' | 'update' | 'delete'
	entityType: 'post' | 'memory' | 'image' | 'comment' | 'like' | 'friendship'
	entityId: string
	createdAt: string
}

export interface PokerPlayerPayload {
	playerId: string
	username: string
}

export interface PokerDealPayload {
	stage: number
	stageName: string
}

export interface PokerBetPayload {
	playerId: string
	username: string
	chipCount: number
}

export interface PokerRaisePayload {
	playerId: string
	username: string
}

export interface PokerFoldPayload {
	playerId: string
	username: string
}

export interface PokerTurnPayload {
	currentPlayerId: string
	currentPlayerUsername: string
}

export interface PokerStateUpdatePayload {
	players: any[]
	deck: any[]
	communalCards: any[]
	pot: any[]
	stage: number
	playing: boolean
	currentPlayerIndex: number
	playerBets: number[]
	winner?: {
		winnerId: string
		winnerName: string
		handRank: string
		isTie: boolean
		tiedPlayers?: string[]
	}
}

export interface PokerGameDeletedPayload {
	gameId: string
}
