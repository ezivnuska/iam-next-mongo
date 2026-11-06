// app/ui/header/user-button.tsx

'use client';

import Link from 'next/link';
import { useUser } from '@/app/lib/providers/user-provider';
import UserAvatar from '@/app/ui/user/user-avatar';
import { useHorizontalLayout } from '@iam/ui';

export default function UserButton() {
    const { user } = useUser();
    const horizontalLayout = useHorizontalLayout();

    if (!user || user.isGuest) return null;

    const profilePath = user.username ? `/users/${user.username}` : '/profile';
    const avatarSize = horizontalLayout ? 48 : 36;

    return (
        <Link href={profilePath} className='flex items-center gap-2 text-gray-700 hover:text-gray-500 transition-colors'>
            <UserAvatar username={user.username} size={avatarSize} />
            <span className='font-bold leading-none text-gray-900 whitespace-nowrap' style={{ fontSize: 'clamp(18px, 4vw, 32px)' }}>{user.username}</span>
        </Link>
    );
}
