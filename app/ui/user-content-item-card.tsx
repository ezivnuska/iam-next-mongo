// app/ui/user-content-item-card.tsx

'use client';

import type { ContentItem } from '@/app/lib/definitions/content';
import UserMemory from '@/app/ui/memories/user-memory';
import UserPost from '@/app/ui/posts/user-post';
import UserImage from '@/app/ui/images/user-image';
import type { Memory } from '@/app/lib/definitions/memory';
import type { Post } from '@/app/lib/definitions/post';
import type { Image } from '@/app/lib/definitions/image';

type UserContentItemCardProps = {
    item: ContentItem;
    onDeleted: (id: string) => void;
    onEdit: (item: ContentItem) => void;
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
        return (
            <UserImage
                image={item as Image}
                onDeleted={onDeleted}
            />
        );
    }

    return null;
}
