"use server";

import { Types } from "mongoose";
import { connectToDatabase } from "@/app/lib/mongoose";
import { requireAuthWithUsername } from "@/app/lib/utils/auth/utils";
import { deleteS3File } from "@/app/lib/aws/s3";
import UserModel from "@/app/lib/models/user";
import ImageModel from "@/app/lib/models/image";
import EntryModel from "@/app/lib/models/entry";
import Comment from "@/app/lib/models/comment";
import Like from "@/app/lib/models/like";
import Activity from "@/app/lib/models/activity";
import Friendship from "@/app/lib/models/friendship";
import MembershipModel from "@/app/lib/models/membership";
import GameScoreModel from "@/app/lib/models/gameScore";
import AllocationModel from "@/app/lib/models/allocation";
import Pledge from "@/app/lib/models/pledge";
import Fee from "@/app/lib/models/fee";
import { TetrisScoreModel, TileScoreModel, WordDuelScoreModel } from "@iam/db";

export async function deleteAccount() {
    const { id: userId } = await requireAuthWithUsername();
    const oid = new Types.ObjectId(userId);

    await connectToDatabase();

    // --- Images: delete S3 variants then documents ---
    const images = await ImageModel.find({ userId: oid }).lean<{ _id: Types.ObjectId; variants: { url: string }[] }[]>();
    const imageIds = images.map(img => img._id);

    for (const img of images) {
        for (const v of img.variants) {
            if (v.url) {
                const key = v.url.split(
                    `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`
                )[1];
                if (key) await deleteS3File(key);
            }
        }
    }
    await ImageModel.deleteMany({ userId: oid });

    // --- Entries: collect IDs, delete comments on them, then delete entries ---
    const entries = await EntryModel.find({ author: oid }).select('_id').lean<{ _id: Types.ObjectId }[]>();
    const entryIds = entries.map(e => e._id);

    const contentIds = [...imageIds, ...entryIds];
    if (contentIds.length > 0) {
        await Comment.deleteMany({ refId: { $in: contentIds } });
    }

    await EntryModel.deleteMany({ author: oid });

    // --- Comments the user left on other content ---
    await Comment.deleteMany({ author: oid });

    // --- Remove user from likes arrays on others' entries/images ---
    await EntryModel.updateMany({ likes: oid }, { $pull: { likes: oid } });
    await ImageModel.updateMany({ likes: oid }, { $pull: { likes: oid } });

    // --- Like collection documents ---
    await Like.deleteMany({ user: oid });

    // --- Friendships ---
    await Friendship.deleteMany({ $or: [{ requester: oid }, { recipient: oid }] });

    // --- Activity logs ---
    await Activity.deleteMany({ user: oid });

    // --- Game scores ---
    await GameScoreModel.deleteMany({ userId: oid });
    await TetrisScoreModel.deleteMany({ userId });
    await TileScoreModel.deleteMany({ userId });
    await WordDuelScoreModel.deleteMany({ userId });

    // --- Membership / billing ---
    await MembershipModel.deleteMany({ userId: oid });
    await AllocationModel.deleteMany({ userId: oid });
    await Pledge.deleteMany({ userId: oid });
    await Fee.deleteMany({ userId: oid });

    // --- Finally, delete the user ---
    await UserModel.findByIdAndDelete(oid);
}
