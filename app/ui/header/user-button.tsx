// app/ui/header/user-button.tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/app/lib/providers/user-provider';
import UserAvatar from '@/app/ui/user/user-avatar';
import SignOutButton from '../auth/signout-button';
import SigninButton from '../auth/signin-button';
import clsx from 'clsx';
import { useScreenOrientation } from '@/app/games/poker/lib/hooks/use-screen-orientation';

export default function UserButton() {

    const { user } = useUser();
    const pathname = usePathname();
    const orientation = useScreenOrientation();
    const isPortrait = orientation === 'portrait';

    // Show sign in button if no user or if user is a guest (poker-only)
    const isUnauthenticated = !user || user.isGuest;

    return isUnauthenticated
        ? <SigninButton />
        : pathname === '/profile'
            ? <SignOutButton />
            : (
                <Link href='/profile' className={clsx('w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12', {
                    'w-14 h-14': !isPortrait,
                })}>
                    <UserAvatar username={user.username} />
                </Link>
            );
};
