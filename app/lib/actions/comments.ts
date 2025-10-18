// app/lib/actions/comments.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import Comment from "@/app/lib/models/comment";
import { auth } from "@/app/lib/auth";
import type { CommentRefType } from "@/app/lib/definitions/comment";
import { Types } from "mongoose";
import { logActivity } from "@/app/lib/utils/activity-logger";
import { emitCommentAdded, emitCommentDeleted } from "@/app/lib/socket/emit";

export async function createComment(
	refId: string,
	refType: CommentRefType,
	content: string
) {
	const session = await auth();
	if (!session?.user?.id) {
		throw new Error("Unauthorized");
	}

	const trimmedContent = content.trim();
	if (!refId || !refType || !trimmedContent) {
		throw new Error("Missing required fields");
	}

	await connectToDatabase();

	const comment = await Comment.create({
		refId,
		refType,
		author: session.user.id,
		content: trimmedContent,
	});

	// Log activity
	await logActivity({
		userId: session.user.id,
		action: 'create',
		entityType: 'comment',
		entityId: comment._id,
		entityData: {
			content: trimmedContent,
			refType: refType,
			refId: refId
		}
	});

	// Populate author with avatar to match getComments return type
	const populatedComment = await Comment.findById(comment._id)
		.populate({
			path: 'author',
			select: 'username avatar',
			populate: {
				path: 'avatar',
				select: '_id variants'
			}
		})
		.lean<CommentDocument>();

	if (!populatedComment) {
		throw new Error("Failed to retrieve created comment");
	}

	// Emit socket event
	await emitCommentAdded({
		commentId: populatedComment._id.toString(),
		refId: populatedComment.refId.toString(),
		refType: refType,
		author: {
			id: populatedComment.author._id.toString(),
			username: populatedComment.author.username,
		}
	});

	return {
		id: populatedComment._id.toString(),
		refId: populatedComment.refId.toString(),
		refType: populatedComment.refType as CommentRefType,
		author: {
			id: populatedComment.author._id.toString(),
			username: populatedComment.author.username,
			avatar: populatedComment.author.avatar ? {
				id: populatedComment.author.avatar._id?.toString(),
				variants: populatedComment.author.avatar.variants,
			} : null,
		},
		content: populatedComment.content,
		createdAt: populatedComment.createdAt?.toISOString() ?? new Date().toISOString(),
	};
}

interface CommentDocument {
	_id: any;
	refId: any;
	refType: string;
	author: {
		_id: any;
		username: string;
		avatar?: {
			_id: any;
			variants: any[];
		} | null;
	};
	content: string;
	createdAt?: Date;
}

export async function getComments(refId: string, refType: CommentRefType) {
	await connectToDatabase();

	const comments = await Comment.find({ refId, refType })
		.populate({
			path: 'author',
			select: 'username avatar',
			populate: {
				path: 'avatar',
				select: '_id variants'
			}
		})
		.sort({ createdAt: -1 })
		.lean<CommentDocument[]>();

	return comments.map((comment) => ({
		id: comment._id.toString(),
		refId: comment.refId.toString(),
		refType: comment.refType as CommentRefType,
		author: {
			id: comment.author._id.toString(),
			username: comment.author.username,
			avatar: comment.author.avatar ? {
				id: comment.author.avatar._id?.toString(),
				variants: comment.author.avatar.variants,
			} : null,
		},
		content: comment.content,
		createdAt: comment.createdAt?.toISOString() ?? new Date().toISOString(),
	}));
}

export async function deleteComment(commentId: string) {
	const session = await auth();
	if (!session?.user?.id) {
		throw new Error("Unauthorized");
	}

	await connectToDatabase();

	const comment = await Comment.findById(commentId);
	if (!comment) {
		throw new Error("Comment not found");
	}

	// Only allow author or admin to delete comment
	const isAuthor = comment.author.toString() === session.user.id;
	const isAdmin = session.user.role === 'admin';

	if (!isAuthor && !isAdmin) {
		throw new Error("Unauthorized to delete this comment");
	}

	// Save comment data before deletion for activity log
	const commentData = {
		content: comment.content,
		refType: comment.refType,
		refId: comment.refId.toString(),
		authorId: comment.author.toString()
	};

	await Comment.findByIdAndDelete(commentId);

	// Log activity
	await logActivity({
		userId: session.user.id,
		action: 'delete',
		entityType: 'comment',
		entityId: commentId,
		entityData: commentData
	});

	// Emit socket event
	await emitCommentDeleted({
		commentId,
		refId: commentData.refId,
		refType: commentData.refType as CommentRefType,
		author: {
			id: session.user.id,
			username: session.user.name || session.user.email || 'Unknown',
		}
	});

	return { success: true };
}

export async function getCommentCounts(refIds: string[], refType: CommentRefType) {
	await connectToDatabase();

	const counts = await Comment.aggregate([
		{
			$match: {
				refId: { $in: refIds.map(id => new Types.ObjectId(id)) },
				refType
			}
		},
		{
			$group: {
				_id: '$refId',
				count: { $sum: 1 }
			}
		}
	]);

	// Convert to map for easy lookup
	const countMap: Record<string, number> = {};
	counts.forEach((item: any) => {
		countMap[item._id.toString()] = item.count;
	});

	return countMap;
}
