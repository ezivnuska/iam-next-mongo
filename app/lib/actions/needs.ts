// app/lib/actions/needs.ts

import Issue from "@/app/lib/models/issue";
import "@/app/lib/models/image";
import type { Issue as NeedType } from "@/app/lib/definitions/issue";
import { connectToDatabase } from "../mongoose";
import { transformPopulatedImage, transformPopulatedAuthor } from "@/app/lib/utils/transformers";

export async function getNeeds(): Promise<NeedType[]> {
  await connectToDatabase()
  const needsFromDb = await Issue.find()
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
