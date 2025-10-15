// app/ui/user-content-item-card.tsx

"use client";

import type { ContentItem } from "@/app/lib/actions/user-content";
import type { PublicContentItem } from "@/app/lib/actions/public-content";
import UserMemory from "@/app/ui/memories/user-memory";
import UserPost from "@/app/ui/posts/user-post";
import type { Memory } from "@/app/lib/definitions/memory";
import type { Post } from "@/app/lib/definitions/post";
import ContentItemCard from "./content-item-card";

type UserContentItemCardProps = {
  item: ContentItem | PublicContentItem;
  onDeleted: (id: string) => void;
  onEdit: (item: ContentItem | PublicContentItem) => void;
  onFlag: (item: Memory | Post) => void;
}

export default function UserContentItemCard({ item, onDeleted, onEdit, onFlag }: UserContentItemCardProps) {
  if (item.contentType === 'memory') {
    return (
      <UserMemory
        memory={item as Memory}
        onDeleted={onDeleted}
        onEdit={() => onEdit(item)}
        onFlag={onFlag as (memory: Memory) => void}
      />
    );
  }

  if (item.contentType === 'post') {
    return (
      <UserPost
        post={item as Post}
        onDeleted={onDeleted}
        onEdit={() => onEdit(item)}
        onFlag={onFlag as (post: Post) => void}
      />
    );
  }

  if (item.contentType === 'image') {
    // Images don't have UserImage component yet.
    // For now, use the regular ContentItemCard for images.
    return <ContentItemCard key={`${item.contentType}-${item.id}`} item={item} />;
  }

  return null;
}
