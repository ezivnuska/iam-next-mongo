// app/lib/actions/memories.ts

import Memory from "@/app/lib/models/memory";
import type { Memory as MemoryType } from "@/app/lib/definitions/memory";
import { connectToDatabase } from "../mongoose";
import { transformPopulatedImage, transformPopulatedAuthor } from "@/app/lib/utils/transformers";

export async function getMemories(): Promise<MemoryType[]> {
  await connectToDatabase()
  const memoriesFromDb = await Memory.find()
    .sort({ date: -1 })
    .populate({
      path: "author",
      populate: {
        path: "avatar"
      }
    })
    .populate("image")
    .exec();

  return memoriesFromDb.map((m: any) => ({
    id: m._id.toString(),
    date: m.date.toISOString(),
    title: m.title,
    content: m.content,
    shared: m.shared,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    author: transformPopulatedAuthor(m.author),
    ...(m.image && { image: transformPopulatedImage(m.image) }),
  }));
}
