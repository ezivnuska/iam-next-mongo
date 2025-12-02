// app/ui/content-item-card.tsx

"use client";

import Image from "next/image";
import type { ContentItem } from "@/app/lib/definitions/content";
import ContentCardWrapper from "@/app/ui/content-card-wrapper";
import ContentInteractions from "@/app/ui/content-interactions";

type ContentItemCardProps = {
  item: ContentItem;
}

export default function ContentItemCard({ item }: ContentItemCardProps) {
  if (item.contentType === 'memory') {
    const memory = item;
    const medium = memory.image?.variants.find((v) => v.size === "medium");
    const memoryDate = new Date(memory.date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    return (
      <ContentCardWrapper
        username={memory.author.username}
        avatar={memory.author.avatar}
        createdAt={memory.createdAt}
      >
        <div className="flex flex-col gap-2 my-2">
            <div className="flex flex-col gap-2">
                <p className="text-lg font-medium text-gray-700">{memory.title || "Untitled"}</p>
                <p className="text-sm text-gray-500">{memoryDate}</p>
            </div>
            {memory.image && (
                <img
                    src={medium?.url}
                    alt="Memory image"
                    className="max-w-full max-h-96 rounded object-cover"
                />
            )}
            <p className="whitespace-pre-wrap">{memory.content}</p>
        </div>
        <ContentInteractions
          itemId={memory.id}
          itemType="Memory"
          initialLiked={memory.likedByCurrentUser}
          initialLikeCount={memory.likes?.length || 0}
          initialCommentCount={memory.commentCount || 0}
        />
      </ContentCardWrapper>
    );
  }

  if (item.contentType === 'post') {
    const post = item;
    const medium = post.image?.variants.find((v) => v.size === "medium");

    return (
      <ContentCardWrapper
        username={post.author.username}
        avatar={post.author.avatar}
        createdAt={post.createdAt}
      >
        <div className='flex flex-col gap-2 my-2'>
            {post.image && (
                <img
                    src={medium?.url}
                    alt="Post image"
                    className="max-w-full max-h-96 rounded my-2 object-cover"
                />
            )}
            <p>{post.content}</p>
            {post.linkUrl && (
                <a href={post.linkUrl} target="_blank" className="text-blue-500 underline mt-2 block">
                    [source]
                </a>
            )}
        </div>
        <ContentInteractions
          itemId={post.id}
          itemType="Post"
          initialLiked={post.likedByCurrentUser}
          initialLikeCount={post.likes?.length || 0}
          initialCommentCount={post.commentCount || 0}
        />
      </ContentCardWrapper>
    );
  }

  if (item.contentType === 'image') {
    const image = item;
    const medium = image.variants.find((v) => v.size === "medium");

    return (
      <ContentCardWrapper
        username={image.username}
        avatar={undefined}
        createdAt={image.createdAt || new Date().toISOString()}
      >
        {medium?.url && (
          <div className="relative flex w-full h-64 my-2">
            <Image
              src={medium.url}
              alt={image.alt || "Image"}
              fill
              style={{ objectFit: "cover" }}
              className="rounded"
            />
          </div>
        )}
        <ContentInteractions
          itemId={image.id}
          itemType="Image"
          initialLiked={image.likedByCurrentUser}
          initialLikeCount={image.likes?.length || 0}
          initialCommentCount={image.commentCount || 0}
        />
      </ContentCardWrapper>
    );
  }

  return null;
}
