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

	// Issue events
	ISSUE_CREATED: 'issue:created',
	ISSUE_APPLICANT_ADDED: 'issue:applicant_added',
	ISSUE_APPLICANT_REMOVED: 'issue:applicant_removed',
	ISSUE_APPLICANT_ACCEPTED: 'issue:applicant_accepted',
	ISSUE_COMPLETION_SUBMITTED: 'issue:completion_submitted',
	ISSUE_COMPLETION_REVIEWED: 'issue:completion_reviewed',
	ISSUE_PLEDGE_ADDED: 'issue:pledge_added',
	ISSUE_PLEDGE_REMOVED: 'issue:pledge_removed',

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
	entityType: 'post' | 'memory' | 'issue' | 'image' | 'comment' | 'like' | 'friendship' | 'pledge'
	entityId: string
	createdAt: string
}

export interface IssueApplicantPayload {
	issueId: string
	applicant: {
		id: string
		userId: string
		issueId: string
		status: string
		createdAt: string
		acceptedAt: string | null
	}
}

export interface IssueApplicantRemovedPayload {
	issueId: string
	applicantId: string
}

export interface IssueCompletionPayload {
	issueId: string
	completion: {
		id: string
		issueId: string
		workerUserId: string
		username: string | null
		avatar: any | null
		images: any[]
		reviews: { userId: string; vote: 'approve' | 'deny' }[]
		status: 'pending' | 'approved' | 'denied' | 'worker_decision'
		createdAt: string
		completedAt: string | null
		autoApproveAt?: string | null
	}
	issue?: any
	previousCompletions?: any[]
}

export interface IssueCreatedPayload {
	actorId: string
	issue: any
}

export interface IssuePledgePayload {
	issueId: string
	actorId: string
	pledge: {
		id: string
		userId: string
		issueId: string
		amount: number
		createdAt: string
		username: string
		avatar: any | null
	}
}

export interface IssuePledgeRemovedPayload {
	issueId: string
	actorId: string
	pledgeId: string
}

export type {
	PokerStateUpdatePayload,
	PokerGameDeletedPayload,
	PokerJoinGamePayload,
	PokerJoinSuccessPayload,
	PokerJoinErrorPayload,
	PokerPlayerJoinedPayload,
	PokerPlayerLeftPayload,
	PokerSetPresencePayload,
	PokerPlayerPresenceUpdatedPayload,
	PokerGameLockedPayload,
	PokerBetPlacedPayload,
	PokerCardsDealtPayload,
	PokerRoundCompletePayload,
	PokerActionTimerStartedPayload,
	PokerActionTimerPausedPayload,
	PokerActionTimerResumedPayload,
	PokerActionTimerActionSetPayload,
	PokerBetPayload,
	PokerFoldPayload,
	PokerSetTimerActionPayload,
	PokerBetSuccessPayload,
	PokerFoldSuccessPayload,
	PokerTimerSuccessPayload,
	PokerBetErrorPayload,
	PokerFoldErrorPayload,
	PokerTimerErrorPayload,
	PokerGameNotificationPayload,
	PokerNotificationType,
	PokerNotificationPayload,
} from '@iam/shared-types';
