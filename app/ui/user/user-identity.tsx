'use client';

import UserAvatar from '@/app/ui/user/user-avatar';
import type { Image as ImageType } from '@/app/lib/definitions/image';

interface UserIdentityProps {
    username: string;
    avatar?: ImageType | null;
    size?: number;
    stacked?: boolean;
}

export default function UserIdentity({ username, avatar, size = 36, stacked = false }: UserIdentityProps) {
    if (stacked) {
        return (
            <div className='flex flex-col items-center gap-1'>
                <div className='shrink-0' style={{ width: size, height: size }}>
                    <UserAvatar username={username} avatar={avatar} size={size} />
                </div>
                <span className='text-xs font-bold leading-none text-gray-900 truncate w-full text-center'>
                    {username}
                </span>
            </div>
        );
    }
    return (
        <div className='flex items-center gap-2'>
            <div className='shrink-0' style={{ width: size, height: size }}>
                <UserAvatar username={username} avatar={avatar} size={size} />
            </div>
            <span className='font-bold leading-none text-gray-900 whitespace-nowrap' style={{ fontSize: 'clamp(18px, 4vw, 32px)' }}>
                {username}
            </span>
        </div>
    );
}
