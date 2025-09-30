//app/lib/definitions/user.ts

import { Document, Types } from 'mongoose'
import type { Image, ImageDocument } from './image'

export enum UserRole {
	User = 'user',
	Admin = 'admin',
}

// DB-level schema
export interface UserDocument extends Document {
	_id: Types.ObjectId
	username: string
	email: string
	role: UserRole
	bio: string
	avatar?: Types.ObjectId | ImageDocument
	password: string
	verified: boolean
	verifyToken?: string
	verifyTokenExpires?: Date
	resetPasswordToken?: string
	resetPasswordExpires?: Date
	createdAt: Date
	updatedAt: Date
}

export interface AuthResponse {
	id: string
	username: string
	email: string
	password: string
}

// Normalized version for client/API use
export interface User {
	id: string
	username: string
	email: string
	role: UserRole
	bio: string
	avatar?: Image
	verified: boolean
	createdAt: string
	updatedAt: string
}

export interface PartialUser {
    id: string,
	username: string
	avatar?: Image
}

export interface Author {
    id: string,
	username: string
	avatar?: Image
}

export interface AuthResponseType {
	accessToken: string
    refreshToken?: string
	user: User
}

export interface RefreshTokenResponse {
    accessToken: string
    user: User
}
  