// app/about/page.tsx

import PageHeader from '@/app/ui/layout/page-header';
import Link from 'next/link';
import { PuzzlePieceIcon } from '@heroicons/react/24/solid';
import { Metadata } from 'next';
import PageContent from '@/app/ui/layout/page/page-content';
import PokerChipIcon from '@/app/ui/icons/poker-chip-icon';

export const metadata: Metadata = {
    title: 'About',
    description: 'About Eric',
};

const pages = [
    {
        title: 'About',
        description: 'About Me',
        href: '/about/about',
        icon: PuzzlePieceIcon,
    },
    {
        title: 'Work',
        description: 'Work Experience',
        href: '/about/work',
        icon: PokerChipIcon,
    },
];

export default function AboutPage() {
    return (
        <PageContent>
            <PageHeader
                useBreadcrumbs={true}
                breadcrumbs={[
                    { label: 'About', href: '/about', active: true }
                ]}
                subtitle='About Me'
            />

            <div className='grid gap-4 px-2 pb-8'>
                {pages.map((page) => {
                    const IconComponent = page.icon;
                    return (
                        <Link
                            key={page.href}
                            href={page.href}
                            className='flex items-center gap-4 p-6 rounded-2xl border-2 border-gray-700 bg-gray-800 hover:border-blue-500 hover:bg-gray-700 transition-all duration-200 group'
                        >
                            <div className='shrink-0'>
                                <IconComponent className='w-12 h-12 text-gray-400 group-hover:text-blue-500 transition-colors' />
                            </div>
                            <div className='flex-1'>
                                <h2 className='text-xl font-bold text-white group-hover:text-blue-400 transition-colors'>
                                    {page.title}
                                </h2>
                                <p className='text-gray-400 mt-1'>
                                    {page.description}
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
