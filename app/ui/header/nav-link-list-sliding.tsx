// app/ui/header/nav-link-list-sliding.tsx

'use client';

import {
    AcademicCapIcon,
    PuzzlePieceIcon,
    UserCircleIcon,
    UserGroupIcon,
    UsersIcon,
    NewspaperIcon,
    Squares2X2Icon,
    ChevronLeftIcon,
    PhotoIcon,
} from '@heroicons/react/24/solid';
import clsx from 'clsx';
import NavButtonSquare from '@/app/ui/header/nav-button-square';
import { useUser } from '@/app/lib/providers/user-provider';
import { ReactNode, useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

interface NavLinkListSlidingProps {
  className?: string;
  onLinkClick?: (href: string) => void;
  links?: NavLink[];
  isVisible?: boolean;
}

// Default links
const defaultLinks: NavLink[] = [
    // {
    //     href: '/work',
    //     title: 'Work',
    //     subtitle: 'My Experience',
    //     icon: <AcademicCapIcon className='w-10 h-10' />,
    //     requiresAuth: false,
    // },
    {
        href: '/eric',
        title: 'Eric',
        subtitle: 'About Eric',
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
    {
        href: '/profile',
        title: 'Account',
        subtitle: 'Account Profile',
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
        href: '/us',
        title: 'Us',
        subtitle: 'User Feed',
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
        },]
    },
];

// Custom button component for links with sublinks
interface NavButtonWithSublinksProps {
    link: NavLink;
    onClick: () => void;
}

function NavButtonWithSublinks({ link, onClick }: NavButtonWithSublinksProps) {
    const pathname = usePathname();
    const isActive = pathname.startsWith(link.href);

    return (
        <div className='min-w-[120px] min-h-[120px] max-h-[200px] p-4'>
        {/* <div className='min-w-[120px] max-w-[200px] min-h-[120px] max-h-[200px] p-4'> */}
            <button
                onClick={onClick}
                className={clsx(
                    'w-full aspect-square flex flex-1 flex-col items-center justify-center p-3 rounded-lg font-medium transition-all relative gap-2',
                    {
                        'bg-blue-300/25 text-white': isActive,
                        'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-sky-100 hover:text-blue-600 hover:border-sky-300': !isActive,
                    }
                )}
            >
                {/* Icon */}
                <div className='w-10 h-10 flex items-center justify-center'>
                    {link.icon}
                </div>

                {/* Title */}
                <span className='text-md text-center leading-tight'>
                    {link.title}
                </span>

                {/* Badge */}
                {link.badge !== null && link.badge !== undefined && link.badge > 0 && (
                    <span className='absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full'>
                        {link.badge}
                    </span>
                )}
            </button>
        </div>
    );
}

export default function NavLinkListSliding({
    className,
    onLinkClick,
    links = defaultLinks,
    isVisible = true
}: NavLinkListSlidingProps) {
    const { status, user } = useUser();
    const [activeSubMenu, setActiveSubMenu] = useState<NavLink | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const touchStartX = useRef<number>(0);
    const touchEndX = useRef<number>(0);
    const pathname = usePathname();

    // Show private links when authenticated or signing out
    const isAuthenticated = user && (status === 'authenticated' || status === 'signing-out');

    // Automatically detect and show appropriate submenu based on pathname
    useEffect(() => {
        if (!isVisible) return;

        // Find which link the current pathname belongs to
        const matchingLink = links.find(link => {
            // Check if pathname starts with the link's href and the link has sublinks
            return pathname.startsWith(link.href) && link.subLinks && link.subLinks.length > 0;
        });

        if (matchingLink) {
            // Filter the matching link based on auth
            if (matchingLink.requiresAuth && !isAuthenticated) {
                setActiveSubMenu(null);
            } else {
                setActiveSubMenu(matchingLink);
            }
        } else {
            setActiveSubMenu(null);
        }
    }, [isVisible, pathname, links, isAuthenticated]);

    // Filter links based on auth
    const filteredLinks = links.filter(link => {
        if (link.requiresAuth && !isAuthenticated) {
            return false;
        }
        return true;
    });

    // Handle opening submenu
    const handleOpenSubMenu = (link: NavLink) => {
        if (link.subLinks && link.subLinks.length > 0) {
            setActiveSubMenu(link);
        }
    };

    // Handle closing submenu
    const handleCloseSubMenu = () => {
        setActiveSubMenu(null);
    };

    // Touch event handlers for swipe detection
    const handleTouchStart = (e: React.TouchEvent) => {
        touchStartX.current = e.touches[0].clientX;
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        touchEndX.current = e.touches[0].clientX;
    };

    const handleTouchEnd = () => {
        // Detect right swipe (touch start < touch end)
        const swipeDistance = touchEndX.current - touchStartX.current;
        const minSwipeDistance = 50; // Minimum swipe distance in pixels

        if (swipeDistance > minSwipeDistance && activeSubMenu) {
            handleCloseSubMenu();
        }

        // Reset
        touchStartX.current = 0;
        touchEndX.current = 0;
    };

    // Filter sublinks based on auth
    const getFilteredSubLinks = (subLinks?: NavLink[]) => {
        if (!subLinks) return [];
        return subLinks.filter(subLink => {
            if (subLink.requiresAuth && !isAuthenticated) {
                return false;
            }
            return true;
        });
    };

    const activeSubLinks = activeSubMenu ? getFilteredSubLinks(activeSubMenu.subLinks) : [];

    return (
        <div
            className={clsx('flex flex-1 w-full items-stretch relative overflow-hidden', className)}
            ref={containerRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {/* Main container with first-level links */}
            <div
                className={clsx(
                    'flex flex-row items-center justify-center flex-wrap w-full self-center transition-transform duration-300 ease-in-out',
                    // 'flex flex-row items-center justify-center flex-wrap w-full max-w-4/5 self-center transition-transform duration-300 ease-in-out',
                    {
                        '-translate-x-full': activeSubMenu,
                        'translate-x-0': !activeSubMenu,
                    }
                )}
            >
                {filteredLinks.map((link) => {
                    // If link has sublinks, render custom button
                    if (link.subLinks && link.subLinks.length > 0) {
                        return (
                            <NavButtonWithSublinks
                                key={link.href}
                                link={link}
                                onClick={() => handleOpenSubMenu(link)}
                            />
                        );
                    }

                    // Otherwise, render normal nav button
                    return (
                        <NavButtonSquare
                            key={link.href}
                            href={link.href}
                            title={link.title}
                            icon={link.icon}
                            badge={link.badge}
                            onClick={() => onLinkClick?.(link.href)}
                        />
                    );
                })}
            </div>

            {/* Submenu container that slides in from right */}
            <div
                className={clsx(
                    'absolute top-0 left-0 right-0 bottom-0 transition-transform duration-300 ease-in-out',
                    {
                        'translate-x-0': activeSubMenu,
                        'translate-x-full': !activeSubMenu,
                    }
                )}
            >
                <div className='flex h-full items-center justify-center'>
                    {activeSubMenu && (
                        <div className='flex flex-1 flex-col items-stretch justify-stretch'>
                            {/* Back button */}
                            <div className='max-w-[600px] mx-auto p-4 flex items-center'>
                                <button
                                    onClick={handleCloseSubMenu}
                                    className='flex items-center gap-2 text-gray-900 dark:text-white hover:text-sky-600 dark:hover:text-sky-300 transition-colors'
                                >
                                    <ChevronLeftIcon className='w-6 h-6' />
                                    {/* <span className='text-lg font-medium'>Back</span> */}
                                </button>
                                <span className='ml-4 text-lg font-medium text-gray-700 dark:text-white/70'>
                                    {activeSubMenu.title}
                                </span>
                            </div>

                            {/* Sublinks */}
                            <div className='flex flex-1 flex-row items-center justify-center flex-wrap w-full max-w-[600px] self-center'>
                                {activeSubLinks.map((subLink) => (
                                    <NavButtonSquare
                                        key={subLink.href}
                                        href={subLink.href}
                                        title={subLink.title}
                                        icon={subLink.icon}
                                        badge={subLink.badge}
                                        onClick={() => {
                                            onLinkClick?.(subLink.href);
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
