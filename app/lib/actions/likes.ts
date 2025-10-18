// app/lib/actions/likes.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import ImageModel from "@/app/lib/models/image";
import Post from "@/app/lib/models/post";
import Memory from "@/app/lib/models/memory";
import { auth } from "@/app/lib/auth";
import { logActivity } from "@/app/lib/utils/activity-logger";
import { emitLikeAdded, emitLikeRemoved } from "@/app/lib/socket/emit";

type LikeableType = 'Image' | 'Post' | 'Memory';

export async function toggleLike(itemId: string, itemType: LikeableType) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await connectToDatabase();

	const userId = session.user.id;
	let item: any;
	let updated: any;

	// Handle each type separately to avoid TypeScript union issues
	switch (itemType) {
		case 'Image': {
			item = await ImageModel.findById(itemId).select('likes').lean();
			if (!item) throw new Error(`${itemType} not found`);

			const isLikedImage = (item.likes || []).some((id: any) => id.toString() === userId);
			updated = await ImageModel.findByIdAndUpdate(
				itemId,
				isLikedImage ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } },
				{ new: true, select: 'likes' }
			);

			// Log activity
			await logActivity({
				userId,
				action: isLikedImage ? 'delete' : 'create',
				entityType: 'like',
				entityId: itemId,
				entityData: {
					itemType: 'Image',
					isUnlike: isLikedImage
				}
			});

			// Emit socket event
			const likePayload = {
				itemId,
				itemType: 'Image' as const,
				userId,
				username: session.user.name || session.user.email || 'Unknown'
			};
			await (isLikedImage ? emitLikeRemoved(likePayload) : emitLikeAdded(likePayload));

			return {
				liked: !isLikedImage,
				likeCount: updated?.likes?.length || 0
			};
		}

		case 'Post': {
			item = await Post.findById(itemId).select('likes').lean();
			if (!item) throw new Error(`${itemType} not found`);

			const isLikedPost = (item.likes || []).some((id: any) => id.toString() === userId);
			updated = await Post.findByIdAndUpdate(
				itemId,
				isLikedPost ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } },
				{ new: true, select: 'likes' }
			);

			// Log activity
			await logActivity({
				userId,
				action: isLikedPost ? 'delete' : 'create',
				entityType: 'like',
				entityId: itemId,
				entityData: {
					itemType: 'Post',
					isUnlike: isLikedPost
				}
			});

			// Emit socket event
			const likePayload = {
				itemId,
				itemType: 'Post' as const,
				userId,
				username: session.user.name || session.user.email || 'Unknown'
			};
			await (isLikedPost ? emitLikeRemoved(likePayload) : emitLikeAdded(likePayload));

			return {
				liked: !isLikedPost,
				likeCount: updated?.likes?.length || 0
			};
		}

		case 'Memory': {
			item = await Memory.findById(itemId).select('likes').lean();
			if (!item) throw new Error(`${itemType} not found`);

			const isLikedMemory = (item.likes || []).some((id: any) => id.toString() === userId);
			updated = await Memory.findByIdAndUpdate(
				itemId,
				isLikedMemory ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } },
				{ new: true, select: 'likes' }
			);

			// Log activity
			await logActivity({
				userId,
				action: isLikedMemory ? 'delete' : 'create',
				entityType: 'like',
				entityId: itemId,
				entityData: {
					itemType: 'Memory',
					isUnlike: isLikedMemory
				}
			});

			// Emit socket event
			const likePayload = {
				itemId,
				itemType: 'Memory' as const,
				userId,
				username: session.user.name || session.user.email || 'Unknown'
			};
			await (isLikedMemory ? emitLikeRemoved(likePayload) : emitLikeAdded(likePayload));

			return {
				liked: !isLikedMemory,
				likeCount: updated?.likes?.length || 0
			};
		}

		default:
			throw new Error('Invalid likeable type');
	}
}

export async function getLikeStatus(itemId: string, itemType: LikeableType, userId?: string) {
	await connectToDatabase();

	let item: any;

	// Handle each type separately to avoid TypeScript union issues
	switch (itemType) {
		case 'Image':
			item = await ImageModel.findById(itemId).select('likes').lean();
			break;
		case 'Post':
			item = await Post.findById(itemId).select('likes').lean();
			break;
		case 'Memory':
			item = await Memory.findById(itemId).select('likes').lean();
			break;
		default:
			throw new Error('Invalid likeable type');
	}

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
