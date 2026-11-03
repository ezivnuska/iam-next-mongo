// app/ui/header/user-button.tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/app/lib/providers/user-provider';
import UserAvatar from '@/app/ui/user/user-avatar';
import SignOutButton from '../auth/signout-button';
import clsx from 'clsx';
import { useHorizontalLayout } from '@iam/ui';

export default function UserButton() {
    const { user } = useUser();
    const pathname = usePathname();
    const horizontalLayout = useHorizontalLayout();

    if (!user || user.isGuest) return null;

    const profilePath = user.username ? `/users/${user.username}` : '/profile';
    const pathnameUsername = pathname.match(/^\/users\/([^/]+)$/)?.[1];
    const isOnOwnProfile = !!pathnameUsername && pathnameUsername === user.username;

    if (isOnOwnProfile) return <SignOutButton />;

    return (
        <Link href={profilePath} className={clsx('w-[40px] h-[40px]', {
            'w-[56px] h-[56px]': horizontalLayout,
        })}>
            <UserAvatar username={user.username} size={horizontalLayout ? 72 : 50} />
        </Link>
    );
}
