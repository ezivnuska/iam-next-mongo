// app/ui/header/nav-private.tsx

'use client';

import { UserGroupIcon } from '@heroicons/react/24/solid';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useUser } from '@/app/lib/providers/user-provider';
import UserAvatar from '@/app/ui/user/user-avatar';
import NotificationsButton from '@/app/ui/header/notifications-button';
import SignOutButton from '../auth/signout-button';

const links = [
    {
        name: 'Users',
        href: '/users',
        icon: UserGroupIcon,
    }
];

export default function NavPrivate() {

    const { status, user } = useUser()
    const pathname = usePathname();
    // Show nav when authenticated or signing out
    const shouldShow = user && (status === "authenticated" || status === "signing-out");
    return shouldShow && (
        <div className='flex flex-1 flex-row items-center justify-between'>
            <div className='flex flex-row items-center justify-start gap-1'>
                {links.map((link) => {
                    const LinkIcon = link.icon;
                    return (
                        <Link
                            key={link.name}
                            href={link.href}
                            className={clsx(
                                'flex flex-col items-center justify-center rounded-md bg-gray-50 text-sm font-medium py-1 px-1 hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:px-3',
                                {
                                    'bg-sky-100 text-blue-600': pathname === link.href,
                                },
                            )}
                        >
                            <LinkIcon className="w-6 max-[375px]:w-5 self-center" />
                            <p className="text-xs hidden md:block">{link.name}</p>
                        </Link>
                    );
                })}
                <NotificationsButton />
            </div>
            {pathname === '/profile'
                ? <SignOutButton />
                : (
                    <Link href='/profile' className='w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12'>
                        <UserAvatar
                            username={user.username}
                            // size={36}
                        />
                    </Link>
                )
            }
        </div>
    );
}
