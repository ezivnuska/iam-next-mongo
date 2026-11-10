// app/ui/user/entry-header.tsx

import UserAvatar from './user-avatar';
import { formatRelativeTime } from '@/app/lib/utils/format-date';
import type { Image as ImageType } from '@/app/lib/definitions/image';

interface EntryHeaderProps {
    username: string;
    avatar?: ImageType | null;
    avatarSize?: number;
    createdAt: string;
}

export default function EntryHeader({ username, avatar, avatarSize = 36, createdAt }: EntryHeaderProps) {
    return (
        <div className='flex items-center gap-2 shrink-0'>
            <div className='shrink-0' style={{ width: avatarSize, height: avatarSize }}>
                <UserAvatar username={username} avatar={avatar} size={avatarSize} />
            </div>
            <div className='flex flex-col min-w-0'>
                <span className='font-semibold text-sm text-gray-900 leading-tight truncate'>{username}</span>
                <span className='text-xs text-gray-400 leading-tight whitespace-nowrap'>{formatRelativeTime(createdAt)}</span>
            </div>
        </div>
    );
}
