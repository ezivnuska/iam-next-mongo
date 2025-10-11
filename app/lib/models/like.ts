// app/lib/models/like.ts

import { Schema, model } from 'mongoose'

const LikeSchema = new Schema(
	{
		user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
		refId: { type: Schema.Types.ObjectId, required: true },
		refType: { type: String, enum: ['Memory', 'Post', 'Image'], required: true },
	},
	{ timestamps: true }
)

LikeSchema.index({ user: 1, refId: 1, refType: 1 }, { unique: true })

export const LikeModel = model('Like', LikeSchema)
