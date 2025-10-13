// app/lib/actions/posts.ts

import Post from "@/app/lib/models/post";
import type { Post as PostType } from "@/app/lib/definitions/post";
import type { PartialUser } from "@/app/lib/definitions/user";
import type { Image, ImageVariant } from "@/app/lib/definitions/image";
import { connectToDatabase } from "../mongoose";

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
  
  return postsFromDb.map((p: any) => {
    const simpleImage: Image | undefined = p.image
      ? {
          id: p.image._id.toString(),
          userId: p.image.userId.toString(),
          username: p.image.username,
          alt: p.image.alt,
          variants: (p.image.variants || []).map((v: ImageVariant) => ({
            size: v.size,
            filename: v.filename,
            width: v.width,
            height: v.height,
            url: v.url,
          })),
        }
      : undefined;

      const author: PartialUser = p.author
      ? {
          id: p.author._id.toString(),
          username: p.author.username,
          ...(p.author.avatar && typeof p.author.avatar === 'object' && '_id' in p.author.avatar && {
            avatar: {
              id: p.author.avatar._id.toString(),
              userId: p.author.avatar.userId.toString(),
              username: p.author.avatar.username,
              alt: p.author.avatar.alt ?? "",
              variants: (p.author.avatar.variants || []).map((v: ImageVariant) => ({
                size: v.size,
                filename: v.filename,
                width: v.width,
                height: v.height,
                url: v.url,
              })),
            }
          })
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
      ...(simpleImage && { image: simpleImage }),
      ...(p.linkUrl && { linkUrl: p.linkUrl }),
      ...(p.linkPreview && {
        linkPreview: {
          ...(p.linkPreview.title && { title: p.linkPreview.title }),
          ...(p.linkPreview.description && { description: p.linkPreview.description }),
          ...(p.linkPreview.image && { image: p.linkPreview.image }),
        }
      }),
    };
  });
}
