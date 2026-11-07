// app/ui/content-card.tsx

'use client';

import ContentInteractions from './content-interactions';
import type { Image as ImageType } from '@/app/lib/definitions/image';
import UnifiedUserHeader from './user/unified-user-header';

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
        autoExpandComments?: boolean;
        onCommentClick?: () => void;
    };
    compact?: boolean;
    thumbnail?: React.ReactNode;
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
    compact = false,
    thumbnail,
    children,
}: ContentCardProps) {
    const interactions_node = interactions && itemId && itemType && (
        <ContentInteractions
            itemId={itemId}
            itemType={itemType}
            initialLiked={interactions.initialLiked}
            initialLikeCount={interactions.initialLikeCount || 0}
            initialCommentCount={interactions.initialCommentCount || 0}
            autoExpandComments={interactions.autoExpandComments}
            onCommentClick={interactions.onCommentClick}
        />
    );

    if (compact) {
        return (
            <div className='flex flex-row items-center gap-3'>
                {thumbnail && <div className='shrink-0'>{thumbnail}</div>}
                <div className='flex flex-col flex-1 min-w-0'>
                    <UnifiedUserHeader
                        user={author}
                        avatar={avatar}
                        onFlag={actions?.onFlag}
                        onDelete={actions?.onDelete}
                        canDelete={actions?.canDelete}
                        avatarSize={28}
                        variant='compact'
                        clickable
                    />
                    <div className='flex-1 min-w-0'>{children}</div>
                    {interactions_node}
                </div>
            </div>
        );
    }

    return (
        <div className='flex flex-col'>
            <UnifiedUserHeader
              user={author}
              avatar={avatar}
              onFlag={actions?.onFlag}
              onDelete={actions?.onDelete}
              canDelete={actions?.canDelete}
              avatarSize={36}
              clickable
            />

            <div className='flex flex-col flex-1'>
                {children}
                {interactions_node}
            </div>
        </div>
    );
}
