//app/lib/definitions/user.ts

import { Document, Types } from "mongoose";
import type { Image, ImageDocument } from "./image";

export enum UserRole {
  User = "user",
  Admin = "admin",
}

// ----------------------
// DB-level document (server only)
// ----------------------
export interface UserDocument extends Document {
  _id: Types.ObjectId;
  username: string;
  email: string;
  role: UserRole;
  bio: string;
  avatar?: Types.ObjectId | ImageDocument;
  password: string;
  verified: boolean;
  verifyToken?: string;
  verifyTokenExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------
// Client-facing normalized user (safe to expose)
// ----------------------
export interface AppUser {
    id: string;
    username: string;
    email: string;
    role: UserRole;
    bio: string;
    avatar?: Image; 
    verified: boolean;
    createdAt: string;
    updatedAt: string;
    emailVerified?: Date | null;
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
