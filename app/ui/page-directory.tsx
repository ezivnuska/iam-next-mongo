// app/ui/page-directory.tsx

import Link from 'next/link';
import type { FC, SVGProps } from 'react';
import {
    NewspaperIcon,
    UserGroupIcon,
    ClockIcon,
    UserCircleIcon,
} from '@heroicons/react/24/outline';

type IconComponent = FC<SVGProps<SVGSVGElement>>;

interface PageEntry {
    href: string;
    icon: IconComponent;
    title: string;
    description: string;
    auth: boolean;
}

const PAGES: PageEntry[] = [
    {
        href: '/feed',
        icon: NewspaperIcon,
        title: 'Feed',
        description: 'Posts from you and your friends.',
        auth: true,
    },
    {
        href: '/users',
        icon: UserGroupIcon,
        title: 'Community',
        description: 'Browse users and send friend requests.',
        auth: true,
    },
    {
        href: '/profile',
        icon: UserCircleIcon,
        title: 'Profile',
        description: 'Your posts, memories, and images.',
        auth: true,
    },
    {
        href: '/whois',
        icon: ClockIcon,
        title: 'Project History',
        description: 'Career history and open source projects.',
        auth: false,
    },
];

interface PageDirectoryProps {
    authenticated?: boolean;
}

export default function PageDirectory({ authenticated = false }: PageDirectoryProps) {
    const visible = PAGES.filter(p => !p.auth || authenticated);

    return (
        <div className='px-4 py-4 grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3'>
            {visible.map(({ href, icon: Icon, title, description }) => (
                <Link
                    key={href}
                    href={href}
                    className='flex items-start gap-3 p-4 rounded-xl border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors group'
                >
                    <div className='shrink-0 p-2 rounded-lg bg-gray-100 group-hover:bg-blue-100 transition-colors'>
                        <Icon className='w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors' />
                    </div>
                    <div className='min-w-0'>
                        <p className='text-sm font-semibold text-gray-900 leading-tight'>{title}</p>
                        <p className='text-xs text-gray-500 mt-0.5 leading-snug'>{description}</p>
                    </div>
                </Link>
            ))}
        </div>
    );
}
