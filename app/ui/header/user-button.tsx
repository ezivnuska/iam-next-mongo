// app/ui/header/user-button.tsx

'use client';

import Link from 'next/link';
import { useUser } from '@/app/lib/providers/user-provider';
import UserIdentity from '@/app/ui/user/user-identity';
import { useHorizontalLayout } from '@iam/ui';

export default function UserButton() {
    const { user } = useUser();
    const horizontalLayout = useHorizontalLayout() ?? false;

    if (!user || user.isGuest) return null;

    const profilePath = user.username ? `/users/${user.username}` : '/profile';
    const avatarSize = horizontalLayout ? 48 : 36;

    return (
        <Link href={profilePath} className='text-gray-700 hover:text-gray-500 transition-colors'>
            <UserIdentity username={user.username} avatar={user.avatar} size={avatarSize} stacked={horizontalLayout} />
        </Link>
    );
}
