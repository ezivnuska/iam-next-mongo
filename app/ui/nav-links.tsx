// app/ui/nav-links.tsx

'use client';

import {
  UserGroupIcon,
  NewspaperIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { useUser } from '../lib/providers/user-provider';
import Avatar from './avatar';

const links = [
    {
        name: 'Users',
        href: '/users',
        icon: UserGroupIcon,
    },
    {
        name: 'Posts',
        href: '/posts',
        icon: NewspaperIcon,
    },
];

export default function NavLinks() {
  
    const { user } = useUser()
    const pathname = usePathname();
    const avatar = user?.avatar
    return (
        <div className='flex flex-row w-full items-center gap-2'>
            {avatar
                ? (
                    <Link
                        href='/profile'
                        // className='border-1'
                    >
                        <Avatar
                            avatar={avatar}
                            size={30}
                            className='h-[30px] border-1 mr-2'
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
                            'flex flex-col items-center justify-center rounded-md bg-gray-50 text-sm font-medium m-1 p-1 hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start',
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
