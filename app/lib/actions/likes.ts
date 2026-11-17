// app/lib/actions/likes.ts

"use server";

import { connectToDatabase } from "@/app/lib/mongoose";
import ImageModel from "@/app/lib/models/image";
import EntryModel from "@/app/lib/models/entry";
import { Types, type Model } from "mongoose";
import { logActivity } from "@/app/lib/utils/activity-logger";
import { emitLikeAdded, emitLikeRemoved } from "@/app/lib/socket/emit";
import { requireAuth } from "@/app/lib/utils/auth";

type LikeableType = 'Image' | 'Post' | 'Memory';

async function performToggleLike(
    model: Model<any>,
    itemId: string,
    userId: string,
    itemType: LikeableType,
    username: string,
) {
    const userId_oid = new Types.ObjectId(userId);
    const updated = await model.findByIdAndUpdate(
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

    const likePayload = { itemId, itemType, userId, username };
    await (nowLiked ? emitLikeAdded(likePayload) : emitLikeRemoved(likePayload));

    return { liked: nowLiked, likeCount: (updated.likes || []).length };
}

export async function toggleLike(itemId: string, itemType: LikeableType) {
    const user = await requireAuth();
    await connectToDatabase();
    const username = user.name || user.email || 'Unknown';
    const model = itemType === 'Image' ? ImageModel : EntryModel;
    return performToggleLike(model, itemId, user.id, itemType, username);
}
