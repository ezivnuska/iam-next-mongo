// @iam/shared-types
// Wire-format types shared between iam-next-mongo and iam-games.
// No mongoose, no Next.js — pure TypeScript interfaces safe for any runtime.
//
// These are hand-written interfaces that mirror the shapes produced by the
// Zod schemas in api/lib/schemas/. Keep them in sync when schemas change.

// ---------------------------------------------------------------------------
// API contract — auth
// ---------------------------------------------------------------------------

export interface TokenResponse {
  token: string;
}

export interface MeResponse {
  id: string;
  username: string;
  email: string;
  role: string;
  bio?: string;
  avatar: ApiAvatar | null;
  reputation: { approved: number; total: number } | null;
}

// ---------------------------------------------------------------------------
// API contract — users
// ---------------------------------------------------------------------------

export interface UserFriendship {
  id: string;
  status: 'accepted' | 'pending_sent' | 'pending_received';
}

export interface PublicUser {
  id: string;
  username: string;
  bio: string;
  avatar: ApiAvatar | null;
  friendship: UserFriendship | null;
}

export interface UserDetail extends PublicUser {
  reputation: { approved: number; total: number } | null;
}

export interface UsersListResponse { users: PublicUser[]; }
export interface UserDetailResponse { user: UserDetail; }

// ---------------------------------------------------------------------------
// API contract — scores
// ---------------------------------------------------------------------------

export interface TileScoreRequest { score: string; }
export interface TetrisScoreRequest { score: number; }

export interface TileScoreEntry {
  _id: string;
  score: string;
  user: { id: string; username: string; avatar: ApiAvatar | null };
  createdAt: string | Date;
}

export interface TetrisScoreEntry {
  _id: string;
  score: number;
  user: { id: string; username: string; avatar: ApiAvatar | null };
  createdAt: string;
}

// ---------------------------------------------------------------------------
// API contract — leaderboard
// ---------------------------------------------------------------------------

export interface WordDuelEntry {
  userId: string;
  username: string;
  score: number;
  wins: number;
  gamesPlayed: number;
  game: 'word-duel';
  rank: number;
  avatar: ApiAvatar | null;
}

export interface TilePuzzleEntry {
  userId: string;
  username: string;
  bestTime: string;
  timesPlayed: number;
  game: 'tile-puzzle';
  rank: number;
  avatar: ApiAvatar | null;
}

export interface TetrisEntry {
  userId: string;
  username: string;
  bestScore: number;
  gamesPlayed: number;
  game: 'tetris';
  rank: number;
  avatar: ApiAvatar | null;
}

export interface LeaderboardResponse {
  entries: WordDuelEntry[];
  tileEntries: TilePuzzleEntry[];
  tetrisEntries: TetrisEntry[];
}

// ---------------------------------------------------------------------------
// API contract — membership
// ---------------------------------------------------------------------------

export type MembershipTier = 'free' | 'basic' | 'pro';

export interface MembershipResponse {
  tier: MembershipTier;
  creditsTotal: number;
  creditsAllocated: number;
  creditsRemaining: number;
  renewalDate: string | null;
}

// ---------------------------------------------------------------------------
// Shared primitive — avatar (used by several API contract types above)
// ---------------------------------------------------------------------------

export interface ApiVariant {
  size: string;
  filename: string;
  width: number;
  height: number;
  url: string;
}

export interface ApiAvatar {
  id: string;
  variants: ApiVariant[];
}

// ---------------------------------------------------------------------------
// Image
// ---------------------------------------------------------------------------

export interface ImageVariant {
  size: string;
  filename: string;
  width: number;
  height: number;
  url: string;
}

export interface Image {
  id: string;
  userId: string;
  username: string;
  alt?: string;
  variants: {
    url: string;
    size: string;
    width: number;
    height: number;
  }[];
  createdAt?: string;
  likes?: string[];
  likedByCurrentUser?: boolean;
  commentCount?: number;
}

export interface UploadedImage {
  id: string;
  userId: string;
  username: string;
  alt: string;
  variants: {
    url: string;
    size: string;
    width: number;
    height: number;
  }[];
  createdAt: string;
  updatedAt: string;
}

export type SanitizedImage = {
  id: string;
  userId: string;
  username: string;
  variants: ImageVariant[];
  url: string;
  alt?: string;
};

export type SocketImage = {
  id: string;
  userId: string;
  username: string;
  variants: ImageVariant[];
  alt?: string;
};

export interface GalleryImage {
  id: string;
  url: string;
  title?: string;
  createdAt?: string;
}

// ---------------------------------------------------------------------------
// User
// ---------------------------------------------------------------------------

export enum UserRole {
  User = 'user',
  Admin = 'admin',
}

export interface AppUser {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  emailVerified?: Date | null;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  emailVerified?: Date | null;
  bio: string;
  avatar: Image | null;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
  isGuest?: boolean;
}

export interface PartialUser {
  id: string;
  username: string;
  avatar?: Image;
}

export interface Author {
  id: string;
  username: string;
  avatar?: Image;
}

export interface AuthResponseType {
  accessToken: string;
  refreshToken?: string;
  user: AppUser;
}

export interface RefreshTokenResponse {
  accessToken: string;
  user: AppUser;
}

// ---------------------------------------------------------------------------
// Friendship
// ---------------------------------------------------------------------------

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected';

export interface Friendship {
  id: string;
  requester: {
    id: string;
    username: string;
    avatar?: {
      id: string;
      variants: Array<{
        size: string;
        url: string;
        width: number;
        height: number;
      }>;
    } | null;
  };
  recipient: {
    id: string;
    username: string;
    avatar?: {
      id: string;
      variants: Array<{
        size: string;
        url: string;
        width: number;
        height: number;
      }>;
    } | null;
  };
  status: FriendshipStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Friend {
  id: string;
  username: string;
  avatar?: {
    id: string;
    variants: Array<{
      size: string;
      url: string;
      width: number;
      height: number;
    }>;
  } | null;
  friendshipId: string;
  friendsSince: string;
}

// ---------------------------------------------------------------------------
// Tiles / game
// ---------------------------------------------------------------------------

export enum Direction {
  UP = 'up',
  DOWN = 'down',
  LEFT = 'left',
  RIGHT = 'right',
  NONE = 'none',
}

export type TileType = {
  id: number;
  col: number;
  row: number;
  direction: Direction;
};

export enum GameStatus {
  IDLE = 'idle',
  START = 'start',
  PLAYING = 'playing',
  PAUSED = 'paused',
  RESOLVED = 'resolved',
}

export type EmptyPosition = {
  col: number;
  row: number;
};

export interface Score {
  _id: string;
  user: User;
  score: string;
  createdAt: string;
}

// ---------------------------------------------------------------------------
// Image utilities
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Validation utilities
// ---------------------------------------------------------------------------

export function isValidObjectId(id: string): boolean {
  return /^[a-f\d]{24}$/i.test(id)
}

// ---------------------------------------------------------------------------
// Image utilities
// ---------------------------------------------------------------------------

export function getBestVariant(
  image: Image | null | undefined,
  desiredWidth: number
): { url: string; width: number; height: number } | null {
  if (!image?.variants?.length) return null;
  return image.variants.reduce((closest, current) => {
    if (!current.width) return closest;
    return Math.abs(current.width - desiredWidth) < Math.abs((closest.width ?? 0) - desiredWidth)
      ? current
      : closest;
  }, image.variants[0]);
}

export function getVariantBySize(
  image: Image | null | undefined,
  sizeName: string
): { url: string; width: number; height: number; size?: string } | null {
  if (!image?.variants?.length) return null;
  return image.variants.find(v => v.size === sizeName) || image.variants[0];
}

export const IMAGE_SIZES = {
  AVATAR_SMALL: 40,
  AVATAR_MEDIUM: 80,
  AVATAR_LARGE: 120,
  THUMBNAIL: 200,
  CARD: 400,
  CONTENT: 800,
  FULL: 1200,
} as const;

// ---------------------------------------------------------------------------
// Poker socket payloads
// ---------------------------------------------------------------------------

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
