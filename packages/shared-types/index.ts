// @iam/shared-types
// Wire-format types shared between iam-next-mongo and iam-games.
// No mongoose, no Next.js — pure TypeScript interfaces safe for any runtime.
//
// API contract types (inferred from Zod schemas in api/lib/schemas/) are
// re-exported here so iam-games can import them without pulling in Zod.
export type {
  MeResponse,
  TokenResponse,
} from '../../api/lib/schemas/auth'

export type {
  PublicUser,
  UserDetail,
  UsersListResponse,
  UserDetailResponse,
} from '../../api/lib/schemas/user'

export type {
  TileScoreEntry,
  TetrisScoreEntry,
  TileScoreRequest,
  TetrisScoreRequest,
} from '../../api/lib/schemas/score'

export type {
  LeaderboardResponse,
  WordDuelEntry,
  TilePuzzleEntry,
  TetrisEntry,
} from '../../api/lib/schemas/game'

export type { MembershipResponse } from '../../api/lib/schemas/membership'

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
