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

	// Poker events - Core state management
	POKER_STATE_UPDATE: 'poker:state_update', // Full state sync (restart, initial load)
	POKER_GAME_CREATED: 'poker:game_created',
	POKER_GAME_DELETED: 'poker:game_deleted',

	// Poker events - Player management
	POKER_PLAYER_JOINED: 'poker:player_joined',
	POKER_PLAYER_LEFT: 'poker:player_left',
	POKER_GAME_LOCKED: 'poker:game_locked',

	// Poker events - Granular gameplay updates
	POKER_BET_PLACED: 'poker:bet_placed',
	POKER_CARDS_DEALT: 'poker:cards_dealt',
	POKER_ROUND_COMPLETE: 'poker:round_complete',

	// Poker events - Action timer
	POKER_ACTION_TIMER_STARTED: 'poker:action_timer_started',
	POKER_ACTION_TIMER_PAUSED: 'poker:action_timer_paused',
	POKER_ACTION_TIMER_RESUMED: 'poker:action_timer_resumed',
	POKER_ACTION_TIMER_CLEARED: 'poker:action_timer_cleared',
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

export interface PokerStateUpdatePayload {
	_id?: string
	players: any[]
	deck: any[]
	communalCards: any[]
	pot: any[]
	stage: number
	locked: boolean
	lockTime?: string
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

// Player management event payloads
export interface PokerPlayerJoinedPayload {
	player: {
		id: string
		username: string
		chips: any[]
		hand: any[]
	}
	players: any[] // Full updated players array
	playerCount: number
}

export interface PokerPlayerLeftPayload {
	playerId: string
	players: any[] // Full updated players array
	playerCount: number
	gameReset?: boolean // True if game was reset due to only 1 player remaining
}

export interface PokerGameLockedPayload {
	locked: true
	stage: number
	players: any[] // Players with dealt cards
	currentPlayerIndex: number
	lockTime?: string
}

// Granular event payloads
export interface PokerBetPlacedPayload {
	playerIndex: number
	chipCount: number
	pot: any[]
	playerBets: number[]
	currentPlayerIndex: number
}

export interface PokerCardsDealtPayload {
	stage: number
	communalCards: any[]
	deckCount: number
}

export interface PokerRoundCompletePayload {
	winner: {
		winnerId: string
		winnerName: string
		handRank: string
		isTie: boolean
		tiedPlayers?: string[]
	}
	players: any[] // Updated with chips awarded
}

// Timer event payloads
export interface PokerActionTimerStartedPayload {
	startTime: string          // ISO timestamp when action started
	duration: number           // Duration in seconds
	currentActionIndex: number
	totalActions: number
	actionType: string         // e.g., 'PLAYER_BET', 'DEAL_CARDS'
	targetPlayerId?: string    // Player whose turn it is
}

export interface PokerActionTimerPausedPayload {
	pausedAt: string           // ISO timestamp when paused
	remainingSeconds: number   // How many seconds were left
}

export interface PokerActionTimerResumedPayload {
	resumedAt: string          // ISO timestamp when resumed
	duration: number           // New duration from this point
	currentActionIndex: number
	totalActions: number
	actionType: string
	targetPlayerId?: string
}
