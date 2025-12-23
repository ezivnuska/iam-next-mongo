// app/ui/content-card.tsx

'use client';

import { formatRelativeTime } from '@/app/lib/utils/format-date';
import { useUser } from '@/app/lib/providers/user-provider';
import FlagContentButton from './flag-content-button';
import UserAvatar from './user/user-avatar';
import { useRouter } from 'next/navigation';
import DeleteButtonWithConfirm from './delete-button-with-confirm';
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
        canEdit?: boolean;
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
    const { user } = useUser();
    const router = useRouter();

    const handleUsernameClick = () => {
        if (user?.username === author.username) {
            router.push('/profile');
        } else {
            router.push(`/social/users/${author.username}`);
        }
    };

    return (
        <div className='flex flex-row items-stretch gap-2'>
            <div className='flex flex-1 flex-col'>
                {/* Header */}
                <div className='flex flex-row items-center gap-4'>
                    <div className='flex w-[50px] h-[50px]'>
                        <UserAvatar
                            username={author.username}
                            avatar={avatar}
                            size={50}
                        />
                    </div>
                    <div className='flex flex-1 flex-col'>
                        <p
                            className='text-md font-semibold cursor-pointer hover:underline'
                            onClick={handleUsernameClick}
                        >
                            {author.username}
                        </p>
                        <span className='text-sm text-gray-500'>{formatRelativeTime(createdAt)}</span>
                    </div>
                    {actions && (
                        <div className='flex flex-row items-center gap-2'>
                            {actions.onFlag && <FlagContentButton onFlag={actions.onFlag} />}
                            {actions.canDelete && actions.onDelete && (
                                <DeleteButtonWithConfirm onDelete={actions.onDelete} />
                            )}
                        </div>
                    )}
                </div>

                {/* Content */}
                <div className='flex flex-row items-stretch'>
                    <div className='flex flex-1 flex-col pt-2'>
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
            </div>
        </div>
    );
}
