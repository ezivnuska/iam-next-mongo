// app/lib/actions/likes.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import ImageModel from "@/app/lib/models/image";
import Post from "@/app/lib/models/post";
import Memory from "@/app/lib/models/memory";
import { auth } from "@/app/api/auth/[...nextauth]/route";

type LikeableType = 'Image' | 'Post' | 'Memory';

const getModel = (type: LikeableType) => {
	switch (type) {
		case 'Image':
			return ImageModel;
		case 'Post':
			return Post;
		case 'Memory':
			return Memory;
		default:
			throw new Error('Invalid likeable type');
	}
};

export async function toggleLike(itemId: string, itemType: LikeableType) {
	const session = await auth();
	if (!session?.user?.id) {
		throw new Error("Unauthorized");
	}

	await connectToDatabase();

	const Model = getModel(itemType);
	const userId = session.user.id;

	// Check if user already liked the item
	const item = await (Model.findById(itemId).select('likes').lean() as Promise<{ likes?: any[] } | null>);
	if (!item) {
		throw new Error(`${itemType} not found`);
	}

	const isLiked = (item.likes || []).some((id: any) => id.toString() === userId);

	// Single atomic update operation
	const updated = await Model.findByIdAndUpdate(
		itemId,
		isLiked ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } },
		{ new: true, select: 'likes' }
	);

	return {
		liked: !isLiked,
		likeCount: updated?.likes?.length || 0
	};
}

export async function getLikeStatus(itemId: string, itemType: LikeableType, userId?: string) {
	await connectToDatabase();

	const Model = getModel(itemType);
	const item = await (Model.findById(itemId).select('likes').lean() as Promise<{ likes?: any[] } | null>);

	if (!item) {
		return { liked: false, likeCount: 0 };
	}

	const likes = item.likes || [];
	const liked = userId ? likes.some((id: any) => id.toString() === userId) : false;

	return {
		liked,
		likeCount: likes.length
	};
}
