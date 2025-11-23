//app/lib/definitions/user.ts

import { Document, PopulatedDoc, Types } from "mongoose";
import type { ObjectId } from "mongoose";
import type { Image, ImageVariant, ImageDocument } from "./image";

export enum UserRole {
  User = "user",
  Admin = "admin",
}

// export interface AppUserAvatar extends Image {
//     variants: ImageVariant[];
// }

// ----------------------
// DB-level document (server only)
// ----------------------
export interface UserDocument extends Document {
  _id: Types.ObjectId;
  username: string;
  email: string;
  role: UserRole;
  bio: string;
  avatar?: Types.ObjectId | ImageDocument | null;
  password: string;
  verified: boolean;
  verifyToken?: string;
  verifyTokenExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
  emailVerified?: Date | null;
}

// ----------------------
// Client-facing normalized user (safe to expose)
// ----------------------
export interface AppUser {
    id: string;
    username: string;
    email: string;
    role: UserRole;
    emailVerified?: Date | null;
}

// ----------------------
// Client-facing normalized user (safe to expose)
// ----------------------
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
    isGuest?: boolean; // For guest users (not persisted in database)
}

// ----------------------
// Partial user info (mentions, small payloads)
// ----------------------
export interface PartialUser {
  id: string;
  username: string;
  avatar?: Image;
}

// ----------------------
// Author reference (posts, comments)
// ----------------------
export interface Author {
  id: string;
  username: string;
  avatar?: Image;
}

// ----------------------
// Auth-related responses (always use AppUser, never include password)
// ----------------------
export interface AuthResponseType {
  accessToken: string;
  refreshToken?: string;
  user: AppUser;
}

export interface RefreshTokenResponse {
  accessToken: string;
  user: AppUser;
}
