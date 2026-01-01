// app/ui/user-content-item-card.tsx

'use client';

import type { ContentItem } from '@/app/lib/definitions/content';
import type { Memory } from '@/app/lib/definitions/memory';
import type { Post } from '@/app/lib/definitions/post';
import ContentItemCard from '@/app/ui/content-item-card';

type UserContentItemCardProps = {
    item: ContentItem;
    onDeleted: (id: string) => void;
    onEdit: (item: ContentItem) => void;
    onFlag: (item: Memory | Post) => void;
}

export default function UserContentItemCard({ item, onDeleted, onEdit, onFlag }: UserContentItemCardProps) {
    return (
        <ContentItemCard
            item={item}
            editable={true}
            onEdit={onEdit as (item: Memory | Post) => void}
            onDeleted={onDeleted}
            onFlag={onFlag}
        />
    );
}
