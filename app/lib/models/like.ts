// app/lib/models/like.ts

import mongoose from 'mongoose'

const LikeSchema = new mongoose.Schema(
	{
		user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
		refId: { type: mongoose.Schema.Types.ObjectId, required: true },
		refType: { type: String, enum: ['Memory', 'Post', 'Image'], required: true },
	},
	{ timestamps: true }
)

LikeSchema.index({ user: 1, refId: 1, refType: 1 }, { unique: true })

const Like = mongoose.models.Like || mongoose.model('Like', LikeSchema)

export default Like
