// app/lib/actions/likes.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import ImageModel from "@/app/lib/models/image";
import EntryModel from "@/app/lib/models/entry";
import { logActivity } from "@/app/lib/utils/activity-logger";
import { emitLikeAdded, emitLikeRemoved } from "@/app/lib/socket/emit";
import { requireAuth } from "@/app/lib/utils/auth";

type LikeableType = 'Image' | 'Post' | 'Memory';

export async function toggleLike(itemId: string, itemType: LikeableType) {
	const user = await requireAuth();
	const userId = user.id;

	await connectToDatabase();
	let updated: any;
	let likePayload: any;

	switch (itemType) {
		case 'Image': {
			const userId_oid = new Types.ObjectId(userId);
			updated = await ImageModel.findByIdAndUpdate(
				itemId,
				[{ $set: { likes: { $cond: {
					if: { $in: [userId_oid, '$likes'] },
					then: { $filter: { input: '$likes', as: 'like', cond: { $ne: ['$$like', userId_oid] } } },
					else: { $concatArrays: ['$likes', [userId_oid]] },
				} } } }],
				{ new: true, select: 'likes' }
			);
			if (!updated) throw new Error('Image not found');

			const nowLiked = (updated.likes || []).some((id: any) => id.toString() === userId);

			await logActivity({
				userId,
				action: nowLiked ? 'create' : 'delete',
				entityType: 'like',
				entityId: itemId,
				entityData: { itemType: 'Image', isUnlike: !nowLiked },
			});

			likePayload = { itemId, itemType: 'Image' as const, userId, username: user.name || user.email || 'Unknown' };
			await (nowLiked ? emitLikeAdded(likePayload) : emitLikeRemoved(likePayload));

			return { liked: nowLiked, likeCount: updated?.likes?.length || 0 };
		}

		case 'Post':
		case 'Memory': {
			const userId_oid = new Types.ObjectId(userId);
			updated = await EntryModel.findByIdAndUpdate(
				itemId,
				[{ $set: { likes: { $cond: {
					if: { $in: [userId_oid, '$likes'] },
					then: { $filter: { input: '$likes', as: 'like', cond: { $ne: ['$$like', userId_oid] } } },
					else: { $concatArrays: ['$likes', [userId_oid]] },
				} } } }],
				{ new: true, select: 'likes' }
			);
			if (!updated) throw new Error(`${itemType} not found`);

			const nowLiked = (updated.likes || []).some((id: any) => id.toString() === userId);

			await logActivity({
				userId,
				action: nowLiked ? 'create' : 'delete',
				entityType: 'like',
				entityId: itemId,
				entityData: { itemType, isUnlike: !nowLiked },
			});

			likePayload = { itemId, itemType: itemType as 'Post' | 'Memory', userId, username: user.name || user.email || 'Unknown' };
			await (nowLiked ? emitLikeAdded(likePayload) : emitLikeRemoved(likePayload));

			return { liked: nowLiked, likeCount: updated?.likes?.length || 0 };
		}

		default:
			throw new Error('Invalid likeable type');
	}
}

