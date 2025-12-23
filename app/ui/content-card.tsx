// app/ui/content-card.tsx

'use client';

import ContentCardHeader from './content-card-header';
import ContentInteractions from './content-interactions';
import type { Image as ImageType } from '@/app/lib/definitions/image';

interface ContentCardProps {
    author: { id: string; username: string };
    avatar?: ImageType | null;
    createdAt: string;
    itemId?: string;
    itemType?: 'Post' | 'Memory' | 'Image';
    actions?: {
        onDelete?: () => Promise<void>;
        onFlag?: () => void;
        canDelete?: boolean;
    };
    interactions?: {
        initialLiked?: boolean;
        initialLikeCount?: number;
        initialCommentCount?: number;
    };
    children: React.ReactNode;
}

export default function ContentCard({
    author,
    avatar,
    createdAt,
    itemId,
    itemType,
    actions,
    interactions,
    children,
}: ContentCardProps) {
    return (
        <div className='flex flex-col'>
            <ContentCardHeader
                author={author}
                avatar={avatar}
                createdAt={createdAt}
                onFlag={actions?.onFlag}
                onDelete={actions?.onDelete}
                canDelete={actions?.canDelete}
            />

            {/* Content */}
            <div className='flex flex-col flex-1 pt-2'>
                {children}

                {/* Footer Interactions */}
                {interactions && itemId && itemType && (
                    <ContentInteractions
                        itemId={itemId}
                        itemType={itemType}
                        initialLiked={interactions.initialLiked}
                        initialLikeCount={interactions.initialLikeCount || 0}
                        initialCommentCount={interactions.initialCommentCount || 0}
                    />
                )}
            </div>
        </div>
    );
}
