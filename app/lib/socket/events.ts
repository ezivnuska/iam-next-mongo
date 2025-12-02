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
	POKER_GAME_STALE_RESET: 'poker:game_stale_reset', // Server -> Clients: Game was reset due to staleness

	// Poker events - Player management
	POKER_JOIN_GAME: 'poker:join_game', // Client -> Server: Request to join game
	POKER_JOIN_SUCCESS: 'poker:join_success', // Server -> Client: Join succeeded
	POKER_JOIN_ERROR: 'poker:join_error', // Server -> Client: Join failed
	POKER_LEAVE_GAME: 'poker:leave_game', // Client -> Server: Request to leave game
	POKER_LEAVE_SUCCESS: 'poker:leave_success', // Server -> Client: Leave succeeded
	POKER_LEAVE_ERROR: 'poker:leave_error', // Server -> Client: Leave failed
	POKER_PLAYER_JOINED: 'poker:player_joined',
	POKER_PLAYER_LEFT: 'poker:player_left',
	POKER_GAME_LOCKED: 'poker:game_locked',
	POKER_GAME_UNLOCKED: 'poker:game_unlocked', // Server -> Clients: Game unlocked (e.g., all players left)
	POKER_SET_PRESENCE: 'poker:set_presence', // Client -> Server: Set player presence (away/present)
	POKER_PLAYER_PRESENCE_UPDATED: 'poker:player_presence_updated', // Server -> Clients: Player presence changed

	// Poker events - Game actions (Client -> Server)
	POKER_BET: 'poker:bet', // Client -> Server: Place bet
	POKER_BET_SUCCESS: 'poker:bet_success', // Server -> Client: Bet succeeded
	POKER_BET_ERROR: 'poker:bet_error', // Server -> Client: Bet failed
	POKER_FOLD: 'poker:fold', // Client -> Server: Fold
	POKER_FOLD_SUCCESS: 'poker:fold_success', // Server -> Client: Fold succeeded
	POKER_FOLD_ERROR: 'poker:fold_error', // Server -> Client: Fold failed
	POKER_SET_TIMER_ACTION: 'poker:set_timer_action', // Client -> Server: Set timer action
	POKER_TIMER_SUCCESS: 'poker:timer_success', // Server -> Client: Timer action set succeeded
	POKER_TIMER_ERROR: 'poker:timer_error', // Server -> Client: Timer action set failed

	// Poker events - Granular gameplay updates
	POKER_BET_PLACED: 'poker:bet_placed',
	POKER_CARDS_DEALT: 'poker:cards_dealt',
	POKER_ROUND_COMPLETE: 'poker:round_complete',
	POKER_DEALER_BUTTON_MOVED: 'poker:dealer_button_moved',

	// Poker events - Action timer
	POKER_ACTION_TIMER_STARTED: 'poker:action_timer_started',
	POKER_ACTION_TIMER_PAUSED: 'poker:action_timer_paused',
	POKER_ACTION_TIMER_RESUMED: 'poker:action_timer_resumed',
	POKER_ACTION_TIMER_CLEARED: 'poker:action_timer_cleared',
	POKER_ACTION_TIMER_ACTION_SET: 'poker:action_timer_action_set',

	// Poker events - Game notifications (legacy - being phased out)
	POKER_GAME_NOTIFICATION: 'poker:game_notification',

	// Poker events - Notification events (new event-based system)
	POKER_NOTIFICATION: 'poker:notification', // Generic notification event
	POKER_NOTIFICATION_CANCELED: 'poker:notification_canceled', // Cancel active notification
	POKER_WINNER_NOTIFICATION_COMPLETE: 'poker:winner_notification_complete', // Client -> Server: Winner notification finished displaying
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
	comment?: {
		id: string
		refId: string
		refType: 'Image' | 'Post' | 'Memory'
		author: {
			id: string
			username: string
			avatar: {
				id?: string
				variants: string[]
			} | null
		}
		content: string
		createdAt: string
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
	dealerButtonPosition?: number
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
export interface PokerJoinGamePayload {
	gameId: string
	username?: string
}

export interface PokerJoinSuccessPayload {
	gameState: any
}

export interface PokerJoinErrorPayload {
	error: string
}

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

export interface PokerSetPresencePayload {
	gameId: string
	isAway: boolean
}

export interface PokerPlayerPresenceUpdatedPayload {
	playerId: string
	isAway: boolean
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

export interface PokerActionTimerActionSetPayload {
	playerId: string           // Player who set the action
	action: 'fold' | 'call' | 'check' | 'bet' | 'raise'  // Selected action
}

// Game action payloads (Client -> Server)
export interface PokerBetPayload {
	gameId: string
	chipCount: number
}

export interface PokerFoldPayload {
	gameId: string
}

export interface PokerSetTimerActionPayload {
	gameId: string
	timerAction: 'fold' | 'call' | 'check' | 'bet' | 'raise'
	betAmount?: number
}

// Game action success payloads (Server -> Client)
export interface PokerBetSuccessPayload {
	success: true
}

export interface PokerFoldSuccessPayload {
	success: true
}

export interface PokerTimerSuccessPayload {
	success: true
}

// Game action error payloads (Server -> Client)
export interface PokerBetErrorPayload {
	error: string
}

export interface PokerFoldErrorPayload {
	error: string
}

export interface PokerTimerErrorPayload {
	error: string
}

export interface PokerGameNotificationPayload {
	message: string
	type: 'blind' | 'deal' | 'action' | 'info'
	duration?: number  // Duration in milliseconds (default 2000)
}

/**
 * New event-based notification system
 * Notifications are typed events with specific payloads
 */
export type PokerNotificationType =
	| 'player_bet'
	| 'player_raise'
	| 'player_call'
	| 'player_check'
	| 'player_fold'
	| 'player_all_in'
	| 'player_thinking'
	| 'player_queued'
	| 'blind_posted'
	| 'cards_dealt'
	| 'winner_determined'
	| 'game_tied'
	| 'stage_advanced'
	| 'player_joined'
	| 'game_starting'
	| 'game_shuffling';

export interface PokerNotificationPayload {
	notificationType: PokerNotificationType;
	category: 'action' | 'info' | 'blind' | 'stage' | 'deal';

	// Player action notifications
	playerId?: string;
	playerName?: string;
	chipAmount?: number;
	isAI?: boolean;  // Indicates if the action was taken by an AI player
	timerTriggered?: boolean;  // Indicates if the action was triggered by timer expiration

	// Blind notifications
	blindType?: 'small' | 'big';

	// Winner notifications
	winnerId?: string;
	winnerName?: string;
	handRank?: string;

	// Tie notifications
	isTie?: boolean;
	tiedPlayers?: string[];

	// Stage notifications
	stage?: number;
	stageName?: string;

	// Game starting countdown
	countdownSeconds?: number;

	// Pot synchronization data (included with betting actions and blinds)
	pot?: any[];
	playerBets?: number[];
	currentPlayerIndex?: number;
}
