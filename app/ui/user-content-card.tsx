// app/ui/user-content-card.tsx

'use client';

import { formatRelativeTime } from '@/app/lib/utils/format-date';
import { useUser } from '@/app/lib/providers/user-provider';
import FlagContentButton from './flag-content-button';
import UserAvatar from './user/user-avatar';
import { useRouter } from 'next/navigation';
import DeleteButtonWithConfirm from './delete-button-with-confirm';
import ContentInteractions from './content-interactions';

interface UserContentCardProps {
    author: { id: string; username: string };
    createdAt: string;
    itemId: string;
    itemType: 'Post' | 'Memory';
    initialLiked?: boolean;
    initialLikeCount: number;
    initialCommentCount: number;
    onDelete: () => Promise<void>;
    onFlag: () => void;
    children: React.ReactNode;
    canEdit: boolean;
    canDelete: boolean;
}

export default function UserContentCard({
    author,
    createdAt,
    itemId,
    itemType,
    initialLiked,
    initialLikeCount,
    initialCommentCount,
    onDelete,
    onFlag,
    children,
    canEdit,
    canDelete,
}: UserContentCardProps) {
    const { user } = useUser();
    const router = useRouter();

    const handleUsernameClick = () => {
        if (user?.username === author.username) {
            router.push('/profile');
        } else {
            router.push(`/social/users/${author.username}`);
        }
    };

    if (!user) return null;

    return (
        <div className='flex flex-row items-stretch gap-2'>
            <div className='flex flex-1 flex-col'>
                {/* Header */}
                <div className='flex flex-row items-center gap-4'>
                    <div className='flex w-[50px] h-[50px]'>
                        <UserAvatar
                            username={user.username}
                            avatar={user.avatar}
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
                    <div className='flex flex-row items-center gap-2'>
                        <FlagContentButton onFlag={onFlag} />
                        {canDelete && <DeleteButtonWithConfirm onDelete={onDelete} />}
                    </div>
                </div>

                {/* Content */}
                <div className='flex flex-row items-stretch'>
                    <div className='flex flex-1 flex-col pt-2'>
                        {children}

                        {/* Footer Interactions */}
                        <ContentInteractions
                            itemId={itemId}
                            itemType={itemType}
                            initialLiked={initialLiked}
                            initialLikeCount={initialLikeCount}
                            initialCommentCount={initialCommentCount}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
