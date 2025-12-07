// app/ui/header/user-button.tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useUser } from '@/app/lib/providers/user-provider';
import UserAvatar from '@/app/ui/user/user-avatar';
import SignOutButton from '../auth/signout-button';
import SigninButton from '../auth/signin-button';

export default function UserButton() {

    const { user } = useUser();
    const pathname = usePathname();

    // Show sign in button if no user or if user is a guest (poker-only)
    const isUnauthenticated = !user || user.isGuest;

    return isUnauthenticated
        ? <SigninButton />
        : pathname === '/profile'
            ? <SignOutButton />
            : (
                <Link href='/profile' className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12'>
                    <UserAvatar username={user.username} />
                </Link>
            );
};
