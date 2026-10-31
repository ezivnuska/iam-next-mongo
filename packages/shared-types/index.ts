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
