// app/ui/content-detail-header.tsx

'use client';

import { useRouter } from 'next/navigation';
import { CloseIcon } from '@iam/ui';
import UserAvatar from './user/user-avatar';
import { formatRelativeTime } from '@/app/lib/utils/format-date';
import type { Image as ImageType } from '@/app/lib/definitions/image';

interface ContentDetailHeaderProps {
    username: string;
    avatar?: ImageType | null;
    createdAt: string;
}

export default function ContentDetailHeader({ username, avatar, createdAt }: ContentDetailHeaderProps) {
    const router = useRouter();

    return (
        <div className='flex items-center justify-between py-2'>
            <div className='flex items-center gap-2'>
                <div className='shrink-0' style={{ width: 36, height: 36 }}>
                    <UserAvatar username={username} avatar={avatar} size={36} />
                </div>
                <div className='flex flex-col min-w-0'>
                    <span className='font-semibold text-sm text-gray-900 leading-tight'>{username}</span>
                    <span className='text-xs text-gray-400 leading-tight'>{formatRelativeTime(createdAt)}</span>
                </div>
            </div>

            <button
                onClick={() => router.back()}
                className='flex items-center justify-center text-gray-400 hover:text-gray-900 transition-colors cursor-pointer'
                aria-label='Close'
            >
                <CloseIcon />
            </button>
        </div>
    );
}
