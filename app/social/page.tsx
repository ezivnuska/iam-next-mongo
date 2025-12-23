// app/social/page.tsx

import PageHeader from '@/app/ui/layout/page-header';
import Link from 'next/link';
import {
    NewspaperIcon,
    UsersIcon,
} from '@heroicons/react/24/solid';
import { Metadata } from 'next';
import PageContent from '@/app/ui/layout/page/page-content';

export const metadata: Metadata = {
    title: 'Social',
    description: 'User Activity',
};

const links = [
    {
        title: 'Feed',
        description: 'Public Posts',
        href: '/social/feed',
        icon: NewspaperIcon,
    },
    {
        title: 'Users',
        description: 'All Users',
        href: '/social/users',
        icon: UsersIcon,
    },
];

export default function SocialPage() {
    return (
        <PageContent>
            <PageHeader
                title='Social'
                subtitle='User Activity'
            />

            <div className='grid gap-4 px-2 pb-8'>
                {links.map((link) => {
                    const IconComponent = link.icon;
                    return (
                        <Link
                            key={link.href}
                            href={link.href}
                            className='flex items-center gap-4 p-6 rounded-2xl border-2 border-gray-700 bg-gray-800 hover:border-blue-500 hover:bg-gray-700 transition-all duration-200 group'
                        >
                            <div className='shrink-0'>
                                <IconComponent className='w-12 h-12 text-gray-400 group-hover:text-blue-500 transition-colors' />
                            </div>
                            <div className='flex-1'>
                                <h2 className='text-xl font-bold text-white group-hover:text-blue-400 transition-colors'>
                                    {link.title}
                                </h2>
                                <p className='text-gray-400 mt-1'>
                                    {link.description}
                                </p>
                            </div>
                            <div className='shrink-0 text-gray-600 group-hover:text-blue-500 transition-colors'>
                                <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                                </svg>
                            </div>
                        </Link>
                    );
                })}
            </div>
        </PageContent>
    );
}
