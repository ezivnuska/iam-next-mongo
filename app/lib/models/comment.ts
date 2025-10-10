// app/lib/models/comment.ts

import mongoose from 'mongoose'

const commentSchema = new mongoose.Schema({
	refId: {
		type: mongoose.Schema.Types.ObjectId,
		required: true,
	},
	refType: {
		type: String,
		enum: ['Memory', 'Post', 'Image'],
		required: true,
	},
	author: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User',
		required: true,
	},
	content: {
		type: String,
		required: true,
	},
}, { timestamps: true })

commentSchema.index({ refId: 1, refType: 1 })

export const Comment = mongoose.models.Comment || mongoose.model('Comment', commentSchema)
