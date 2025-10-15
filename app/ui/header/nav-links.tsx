// app/ui/nav-links.tsx

'use client';

import {
    UserGroupIcon,
    PuzzlePieceIcon,
    UserCircleIcon,
} from '@heroicons/react/24/solid';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useUser } from '@/app/lib/providers/user-provider';
import UserAvatar from '@/app/ui/user/user-avatar';

const links = [
    {
        name: 'Users',
        href: '/users',
        icon: UserGroupIcon,
    },
    {
        name: 'Tiles',
        href: '/tiles',
        icon: PuzzlePieceIcon,
    },
];

export default function NavLinks() {
  
    const { user } = useUser()
    const pathname = usePathname();
    const avatar = user?.avatar
    return (
        <div className='flex flex-row w-full items-center gap-2 min-[375px]:gap-1'>
            {avatar && user
                ? (
                    <Link
                        href='/profile'
                        // className='border-1'
                    >
                        <UserAvatar
                            username={user.username}
                            avatar={avatar}
                            size={36}
                            className='mr-2 min-[375px]:mr-1'
                        />
                    </Link>
                ) : (
                    <Link
                        key='Profile'
                        href='/profile'
                        className={clsx(
                            'flex flex-col items-center justify-center rounded-md bg-gray-50 text-sm font-medium m-1 p-1 hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start',
                            {
                                'bg-sky-100 text-blue-600': pathname === '/profile',
                            },
                        )}
                    >
                        <UserCircleIcon className="w-6 self-center" />
                        <p className="text-xs hidden md:block">Profile</p>
                    </Link>
                )
            }
            {links.map((link) => {
                const LinkIcon = link.icon;
                return (
                    <Link
                        key={link.name}
                        href={link.href}
                        className={clsx(
                            'flex flex-col items-center justify-center rounded-md bg-gray-50 text-sm font-medium m-1 py-1 px-3 hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start',
                            {
                                'bg-sky-100 text-blue-600': pathname === link.href,
                            },
                        )}
                    >
                        <LinkIcon className="w-6 self-center" />
                        <p className="text-xs hidden md:block">{link.name}</p>
                    </Link>
                );
            })}
        </div>
    );
}
