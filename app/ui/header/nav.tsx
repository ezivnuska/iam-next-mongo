// app/ui/header/nav.tsx

'use client';

import { useUser } from '@/app/lib/providers/user-provider';
import NavPrivate from './nav-private';
import NavPublic from './nav-public';

export default function Nav() {

    const { status } = useUser();
    const showNavLinks = status === "authenticated" || status === "signing-out";

    return (
        <div className='flex flex-1 flex-row items-center justify-center gap-1 min-[375px]:gap-1'>
            <NavPublic />
            {showNavLinks && <NavPrivate />}
        </div>
    );
};

