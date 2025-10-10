// app/lib/actions/comments.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import { Comment } from "@/app/lib/models/comment";
import { auth } from "@/app/api/auth/[...nextauth]/route";

export async function createComment(
	refId: string,
	refType: 'Memory' | 'Post' | 'Image',
	content: string
) {
	const session = await auth();
	if (!session?.user?.id) {
		throw new Error("Unauthorized");
	}

	if (!refId || !refType || !content) {
		throw new Error("Missing required fields");
	}

	if (!content.trim()) {
		throw new Error("Content cannot be empty");
	}

	await connectToDatabase();

	const comment = await Comment.create({
		refId,
		refType,
		author: session.user.id,
		content: content.trim(),
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

export async function getComments(refId: string, refType: 'Memory' | 'Post' | 'Image') {
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
		.lean();

	return comments.map((comment: any) => ({
		id: comment._id.toString(),
		refId: comment.refId.toString(),
		refType: comment.refType,
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
