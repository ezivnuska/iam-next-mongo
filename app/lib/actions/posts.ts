// app/lib/actions/posts.ts

import Post from "@/app/lib/models/post";
import type { Post as PostType } from "@/app/lib/definitions/post";
import type { PartialUser } from "@/app/lib/definitions/user";
import type { Image } from "@/app/lib/definitions/image";
import { connectToDatabase } from "../mongoose";

export async function getPosts(): Promise<PostType[]> {
  await connectToDatabase()
  const postsFromDb = await Post.find()
    .populate("author")
    .populate("image")
    .exec();
  
  return postsFromDb.map((p: any) => {
    const simpleImage: Image | undefined = p.image
      ? {
          id: p.image._id.toString(),
          userId: p.image.userId.toString(),
          username: p.image.username,
          alt: p.image.alt,
          variants: p.image.variants,
        }
      : undefined;

      const author: PartialUser = p.author
      ? {
          id: p.author._id.toString(),
          username: p.author.username,
          avatar: p.author.avatar ?? null,
            // ? {
            //     id: p.author.avatar._id.toString(),
            //     userId: p.author.avatar.userId.toString(),
            //     username: p.author.avatar.username,
            //     alt: p.author.avatar.alt ?? "",
            //     variants: p.author.avatar.variants,
            //     createdAt: p.author.avatar.createdAt.toISOString(),
            //     updatedAt: p.author.avatar.updatedAt.toISOString(),
            //   }
            // : undefined,
        }
      : {
          id: "unknown",
          username: "Deleted User",
        };

    return {
      id: p._id.toString(),
      content: p.content,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
      author,
      image: simpleImage,
      linkUrl: p.linkUrl,
      linkPreview: p.linkPreview,
    };
  });
}
