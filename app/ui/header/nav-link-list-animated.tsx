// app/ui/header/nav-link-list-animated.tsx

'use client';

import {
    AcademicCapIcon,
    PuzzlePieceIcon,
    UserCircleIcon,
    UserGroupIcon,
    UsersIcon,
    NewspaperIcon,
    Squares2X2Icon,
    PhotoIcon,
} from '@heroicons/react/24/solid';
import Link from 'next/link';
import { useUser } from '@/app/lib/providers/user-provider';
import { ReactNode } from 'react';
import PokerChipIcon from '@/app/ui/icons/poker-chip-icon';

export interface NavLink {
    href: string;
    title: string;
    subtitle: string;
    icon: ReactNode;
    requiresAuth?: boolean;
    badge?: number | null;
    subLinks?: NavLink[];
}

interface NavLinkListAnimatedProps {
    className?: string;
    links?: NavLink[];
}

// Default links (identical to nav-link-list-sliding)
const defaultLinks: NavLink[] = [
    {
        href: '/profile',
        title: 'You',
        subtitle: 'Your Profile',
        icon: <UserCircleIcon className='w-10 h-10' />,
        requiresAuth: true,
        subLinks: [{
            href: '/profile',
            title: 'Profile',
            subtitle: 'Account Profile',
            icon: <UserCircleIcon className='w-10 h-10' />,
            requiresAuth: true,
        },
        {
            href: '/profile/images',
            title: 'Images',
            subtitle: `User Images`,
            icon: <PhotoIcon className='w-10 h-10' />,
            requiresAuth: true,
        }],
    },
    {
        href: '/us',
        title: 'Us',
        subtitle: 'User Posts',
        icon: <UserGroupIcon className='w-10 h-10' />,
        requiresAuth: true,
        subLinks: [{
            href: '/us/feed',
            title: 'Feed',
            subtitle: 'Public Posts',
            icon: <NewspaperIcon className='w-10 h-10' />,
            requiresAuth: true,
        },
        {
            href: '/us/users',
            title: 'Users',
            subtitle: 'All Users',
            icon: <UsersIcon className='w-10 h-10' />,
            requiresAuth: true,
        }],
    },
    {
        href: '/games',
        title: 'Games',
        subtitle: 'Game Projects',
        icon: <PuzzlePieceIcon className='w-10 h-10' />,
        requiresAuth: false,
        subLinks: [{
            href: '/games/tiles',
            title: 'Tiles',
            subtitle: 'Puzzle Game',
            icon: <Squares2X2Icon className='w-10 h-10' />,
            requiresAuth: false,
        },
        {
            href: '/games/poker',
            title: 'Poker',
            subtitle: `Texas Hold'em`,
            icon: <PokerChipIcon className='w-10 h-10' />,
            requiresAuth: false,
        }],
    },
    {
        href: '/eric',
        title: 'Me',
        subtitle: 'I am Eric',
        icon: <AcademicCapIcon className='w-10 h-10' />,
        requiresAuth: false,
        subLinks: [{
            href: '/eric/about',
            title: 'About',
            subtitle: 'About Me',
            icon: <AcademicCapIcon className='w-10 h-10' />,
            requiresAuth: false,
        },
        {
            href: '/eric/work',
            title: 'Work',
            subtitle: `Work History`,
            icon: <PhotoIcon className='w-10 h-10' />,
            requiresAuth: false,
        }],
    },
];

export default function NavLinkListAnimated({
    className = '',
    links = defaultLinks,
}: NavLinkListAnimatedProps) {
    const { status, user } = useUser();

    // Show private links when authenticated or signing out
    const isAuthenticated = user && (status === 'authenticated' || status === 'signing-out');

    // Filter links based on auth
    const filteredLinks = links.filter(link => {
        if (link.requiresAuth && !isAuthenticated) {
            return false;
        }
        return true;
    });

    return (
        <div className={`flex flex-col items-center justify-center w-full px-4 ${className}`}>
            <nav className='flex flex-col items-center gap-4 w-full max-w-md'>
                {filteredLinks.map((link, index) => (
                    <Link
                        key={link.href}
                        href={link.href}
                        className='w-full'
                        style={{
                            animation: `fade-in 0.6s ease-out ${index * 150}ms both`,
                        }}
                    >
                        <div className='flex items-center gap-4 p-6 rounded-2xl border-2 border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 hover:border-blue-500 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 group'>
                            {/* Icon */}
                            <div className='shrink-0 text-gray-600 dark:text-gray-400 group-hover:text-blue-500 transition-colors'>
                                {link.icon}
                            </div>

                            {/* Text content */}
                            <div className='flex-1'>
                                <h2 className='text-xl font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors'>
                                    {link.title}
                                </h2>
                                <p className='text-gray-600 dark:text-gray-400 mt-1'>
                                    {link.subtitle}
                                </p>
                            </div>

                            {/* Arrow icon */}
                            <div className='shrink-0 text-gray-400 dark:text-gray-600 group-hover:text-blue-500 transition-colors'>
                                <svg className='w-6 h-6' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                                    <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                                </svg>
                            </div>

                            {/* Badge */}
                            {link.badge !== null && link.badge !== undefined && link.badge > 0 && (
                                <span className='absolute -top-2 -right-2 flex items-center justify-center min-w-[24px] h-[24px] px-2 text-sm font-bold text-white bg-red-500 rounded-full'>
                                    {link.badge}
                                </span>
                            )}
                        </div>
                    </Link>
                ))}
            </nav>
        </div>
    );
}
