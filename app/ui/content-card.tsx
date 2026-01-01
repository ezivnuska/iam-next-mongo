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
            <UnifiedUserHeader
              user={author}
              avatar={avatar}
              onFlag={actions?.onFlag}
              onDelete={actions?.onDelete}
              canDelete={actions?.canDelete}
              avatarSize={36}
            //   variant='compact'
              clickable
            />

            {/* Content */}
            <div className='flex flex-col flex-1'>
                {children}

                {/* Footer Interactions */}
                {interactions && itemId && itemType && (
                    <ContentInteractions
                        itemId={itemId}
                        itemType={itemType}
                        initialLiked={interactions.initialLiked}
                        initialLikeCount={interactions.initialLikeCount || 0}
                        initialCommentCount={interactions.initialCommentCount || 0}
                        autoExpandComments={interactions.autoExpandComments}
                    />
                )}
            </div>
        </div>
    );
}
