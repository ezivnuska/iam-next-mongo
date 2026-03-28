// app/lib/actions/needs.ts

import Need from "@/app/lib/models/need";
import "@/app/lib/models/image";
import type { Need as NeedType } from "@/app/lib/definitions/need";
import { connectToDatabase } from "../mongoose";
import { transformPopulatedImage, transformPopulatedAuthor } from "@/app/lib/utils/transformers";

export async function getNeeds(): Promise<NeedType[]> {
  await connectToDatabase()
  const needsFromDb = await Need.find()
    .sort({ date: -1 })
    .populate({
      path: "author",
      populate: {
        path: "avatar"
      }
    })
    .populate("image")
    .exec();

  return needsFromDb.map((n: any) => ({
    id: n._id.toString(),
    title: n.title,
    content: n.content,
    shared: n.shared,
    createdAt: n.createdAt.toISOString(),
    updatedAt: n.updatedAt.toISOString(),
    author: transformPopulatedAuthor(n.author),
    ...(n.image && { image: transformPopulatedImage(n.image) }),
  }));
}
