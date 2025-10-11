// app/lib/actions/likes.ts

import { connectToDatabase } from "@/app/lib/mongoose";
import ImageModel from "@/app/lib/models/image";
import Post from "@/app/lib/models/post";
import Memory from "@/app/lib/models/memory";
import type { Model, Document } from "mongoose";
import { auth } from "@/app/api/auth/[...nextauth]/route";

type LikeableType = "Image" | "Post" | "Memory";

interface LikeableDoc extends Document {
  likes: string[];
}

const getModel = (type: LikeableType): Model<LikeableDoc> => {
  switch (type) {
    case "Image":
      return ImageModel as unknown as Model<LikeableDoc>;
    case "Post":
      return Post as unknown as Model<LikeableDoc>;
    case "Memory":
      return Memory as unknown as Model<LikeableDoc>;
    default:
      throw new Error("Invalid likeable type");
  }
};

export async function toggleLike(itemId: string, itemType: LikeableType) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  await connectToDatabase();

  const Model = getModel(itemType);
  const userId = session.user.id;

  const item = await Model.findById(itemId).select("likes").lean();
  if (!item) throw new Error(`${itemType} not found`);

  const isLiked = (item.likes || []).some((id: any) => id.toString() === userId);

  const updated = await Model.findByIdAndUpdate(
    itemId,
    isLiked ? { $pull: { likes: userId } } : { $addToSet: { likes: userId } },
    { new: true, select: "likes" }
  );

  return {
    liked: !isLiked,
    likeCount: updated?.likes?.length || 0,
  };
}

export async function getLikeStatus(itemId: string, itemType: LikeableType, userId?: string) {
	await connectToDatabase();

	const Model = getModel(itemType);
	const item = await Model.findById(itemId).select('likes').lean();

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
