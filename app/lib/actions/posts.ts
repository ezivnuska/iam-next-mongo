// app/lib/actions/posts.ts

import Post from "@/app/lib/models/post";
import "@/app/lib/models/image"; // Required for populate("image")
import type { Post as PostType } from "@/app/lib/definitions/post";
import { connectToDatabase } from "../mongoose";
import { transformPopulatedImage, transformPopulatedAuthor } from "@/app/lib/utils/transformers";

export async function getPosts(): Promise<PostType[]> {
  await connectToDatabase()
  const postsFromDb = await Post.find()
    .sort({ createdAt: -1 })
    .populate({
      path: "author",
      populate: {
        path: "avatar"
      }
    })
    .populate("image")
    .exec();
  
  return postsFromDb.map((p: any) => ({
    id: p._id.toString(),
    content: p.content,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    author: transformPopulatedAuthor(p.author),
    ...(p.image && { image: transformPopulatedImage(p.image) }),
    ...(p.linkUrl && { linkUrl: p.linkUrl }),
    ...(p.linkPreview && {
      linkPreview: {
        ...(p.linkPreview.title && { title: p.linkPreview.title }),
        ...(p.linkPreview.description && { description: p.linkPreview.description }),
        ...(p.linkPreview.image && { image: p.linkPreview.image }),
      }
    }),
  }));
}
