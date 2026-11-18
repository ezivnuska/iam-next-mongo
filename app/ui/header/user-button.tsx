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
    return (
        <Link href={profilePath} className='text-gray-200 hover:text-white transition-colors'>
            <UserIdentity username={user.username} avatar={user.avatar} size={40} stacked={horizontalLayout} />
        </Link>
    );
}
