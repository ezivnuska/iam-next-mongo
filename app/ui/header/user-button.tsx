// app/ui/header/user-button.tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/app/lib/providers/user-provider';
import UserAvatar from '@/app/ui/user/user-avatar';
import SignOutButton from '../auth/signout-button';
import SigninButton from '../auth/signin-button';
import clsx from 'clsx';
import { useHorizontalLayout } from '@/app/lib/hooks/use-horizontal-layout';

export default function UserButton() {

    const { user } = useUser();
    const pathname = usePathname();
    const horizontalLayout = useHorizontalLayout();

    // Show sign in button if no user or if user is a guest (poker-only)
    const isUnauthenticated = !user || user.isGuest;

    return isUnauthenticated
        ? <SigninButton />
        : pathname === '/profile'
            ? <SignOutButton />
            : (
                <Link href='/profile' className={clsx('w-[40px] h-[40px]', {
                    'w-[56px] h-[56px]': horizontalLayout,
                })}>
                    <UserAvatar username={user.username} size={horizontalLayout ? 72 : 50} />
                </Link>
            );
};
