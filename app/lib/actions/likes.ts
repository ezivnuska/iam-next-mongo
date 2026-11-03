// app/lib/actions/likes.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import ImageModel from "@/app/lib/models/image";
import EntryModel from "@/app/lib/models/entry";
import { logActivity } from "@/app/lib/utils/activity-logger";
import { emitLikeAdded, emitLikeRemoved } from "@/app/lib/socket/emit";
import { requireAuth } from "@/app/lib/utils/auth";

type LikeableType = 'Image' | 'Post' | 'Memory';

async function resolveEntryModel(itemId: string) {
	return EntryModel.findById(itemId).select('likes').lean();
}

export async function toggleLike(itemId: string, itemType: LikeableType) {
	const user = await requireAuth();
	const userId = user.id;

	await connectToDatabase();
	let item: any;
	let updated: any;
	let likePayload: any;

	switch (itemType) {
		case 'Image': {
			item = await ImageModel.findById(itemId).select('likes').lean();
			if (!item) throw new Error('Image not found');

			const isLiked = (item.likes || []).some((id: any) => id.toString() === userId);
			updated = await ImageModel.findByIdAndUpdate(
				itemId,
				isLiked ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } },
				{ new: true, select: 'likes' }
			);

			await logActivity({
				userId,
				action: isLiked ? 'delete' : 'create',
				entityType: 'like',
				entityId: itemId,
				entityData: { itemType: 'Image', isUnlike: isLiked },
			});

			likePayload = { itemId, itemType: 'Image' as const, userId, username: user.name || user.email || 'Unknown' };
			await (isLiked ? emitLikeRemoved(likePayload) : emitLikeAdded(likePayload));

			return { liked: !isLiked, likeCount: updated?.likes?.length || 0 };
		}

		case 'Post':
		case 'Memory': {
			item = await resolveEntryModel(itemId);
			if (!item) throw new Error(`${itemType} not found`);

			const isLiked = (item.likes || []).some((id: any) => id.toString() === userId);
			updated = await EntryModel.findByIdAndUpdate(
				itemId,
				isLiked ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } },
				{ new: true, select: 'likes' }
			);

			await logActivity({
				userId,
				action: isLiked ? 'delete' : 'create',
				entityType: 'like',
				entityId: itemId,
				entityData: { itemType, isUnlike: isLiked },
			});

			likePayload = { itemId, itemType: itemType as 'Post' | 'Memory', userId, username: user.name || user.email || 'Unknown' };
			await (isLiked ? emitLikeRemoved(likePayload) : emitLikeAdded(likePayload));

			return { liked: !isLiked, likeCount: updated?.likes?.length || 0 };
		}

		default:
			throw new Error('Invalid likeable type');
	}
}

export async function getLikeStatus(itemId: string, itemType: LikeableType, userId?: string) {
	await connectToDatabase();

	let item: any;

	switch (itemType) {
		case 'Image':
			item = await ImageModel.findById(itemId).select('likes').lean();
			break;
		case 'Post':
		case 'Memory':
			item = await EntryModel.findById(itemId).select('likes').lean();
			break;
		default:
			throw new Error('Invalid likeable type');
	}

	if (!item) return { liked: false, likeCount: 0 };

	const likes = item.likes || [];
	return {
		liked: userId ? likes.some((id: any) => id.toString() === userId) : false,
		likeCount: likes.length,
	};
}
