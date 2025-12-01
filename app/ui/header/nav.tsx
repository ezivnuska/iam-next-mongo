// app/ui/header/nav.tsx

'use client';

import { useUser } from '@/app/lib/providers/user-provider';
import NavPrivate from './nav-private';
import NavPublic from './nav-public';
import AuthLinks from './auth-links';

export default function Nav() {

    const { status, user } = useUser()
    const showNavLinks = status === "authenticated" || status === "signing-out";
    return (
        <div className='flex flex-row w-full items-center gap-2 min-[375px]:gap-1'>
            <NavPublic />
            {showNavLinks
                ? <NavPrivate />
                : <AuthLinks />
            }
        </div>
    );
}
