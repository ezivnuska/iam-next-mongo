// apps/backend/src/models/user.model.ts

import mongoose, { Schema } from 'mongoose'
import { UserDocument, UserRole } from '@/app/lib/definitions'
  
const UserSchema = new Schema<UserDocument>({
	username: { type: String, required: true },
	email: { type: String, required: true, unique: true },
	role: { type: String, enum: Object.values(UserRole), default: UserRole.User },
    bio: { type: String },
    avatar: { type: Schema.Types.ObjectId, ref: 'Image', default: undefined },
	password: { type: String, required: true },
	verified: { type: Boolean, default: false },
	verifyToken: String,
	verifyTokenExpires: Date,
	resetPasswordToken: String,
	resetPasswordExpires: Date,
}, {
	timestamps: true
})

export const UserModel = mongoose.model<UserDocument>('User', UserSchema)