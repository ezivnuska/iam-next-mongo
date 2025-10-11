// app/lib/actions/comments.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import { Comment } from "@/app/lib/models/comment";
import { auth } from "@/app/api/auth/[...nextauth]/route";
import type { CommentRefType } from "@/app/lib/definitions/comment";
import { Types } from "mongoose";

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

	return {
		id: comment._id.toString(),
		refId: comment.refId.toString(),
		refType: comment.refType,
		author: comment.author.toString(),
		content: comment.content,
		createdAt: comment.createdAt?.toISOString() ?? new Date().toISOString(),
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

	await Comment.findByIdAndDelete(commentId);

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
