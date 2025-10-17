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
