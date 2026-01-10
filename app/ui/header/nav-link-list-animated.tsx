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
import { useUser } from '@/app/lib/providers/user-provider';
import { ReactNode, useState, useEffect } from 'react';
import PokerChipIcon from '@/app/ui/icons/poker-chip-icon';
import NavLinkCardAnimated from '@/app/ui/header/nav-link-card-animated';
import clsx from 'clsx';

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
    initialSection?: string | null;
}

// Default links (identical to nav-link-list-sliding)
const defaultLinks: NavLink[] = [
    // {
    //     href: '/profile',
    //     title: 'You',
    //     subtitle: 'Your Profile',
    //     icon: <UserCircleIcon className='w-10 h-10' />,
    //     requiresAuth: true,
    //     subLinks: [{
    //         href: '/profile',
    //         title: 'Profile',
    //         subtitle: 'Account Profile',
    //         icon: <UserCircleIcon className='w-10 h-10' />,
    //         requiresAuth: true,
    //     },
    //     {
    //         href: '/profile/images',
    //         title: 'Images',
    //         subtitle: `User Images`,
    //         icon: <PhotoIcon className='w-10 h-10' />,
    //         requiresAuth: true,
    //     }],
    // },
    {
        href: '/feed',
        title: 'Feed',
        subtitle: 'User Posts',
        icon: <NewspaperIcon className='w-10 h-10' />,
        requiresAuth: true,
    },
    {
        href: '/users',
        title: 'Users',
        subtitle: 'All Users',
        icon: <UsersIcon className='w-10 h-10' />,
        requiresAuth: true,
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
        href: '/about',
        title: 'Who is Eric?',
        subtitle: 'About Me',
        icon: <AcademicCapIcon className='w-10 h-10' />,
        requiresAuth: false,
        subLinks: [{
            href: '/about/eric',
            title: 'About',
            subtitle: 'About Me',
            icon: <AcademicCapIcon className='w-10 h-10' />,
            requiresAuth: false,
        },
        {
            href: '/about/work',
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
    initialSection = null,
}: NavLinkListAnimatedProps) {
    const { status, user } = useUser();
    const [activeSubMenu, setActiveSubMenu] = useState<NavLink | null>(null);

    // Show private links when authenticated or signing out
    const isAuthenticated = user && (status === 'authenticated' || status === 'signing-out');

    // Handle initialSection query parameter to auto-open submenu
    useEffect(() => {
        if (initialSection) {
            // Map section names to hrefs
            const sectionMap: { [key: string]: string } = {
                'about': '/about',
                'eric': '/about',
                'us': '/us',
                'games': '/games',
                'profile': '/profile',
                'you': '/profile',
            };

            const targetHref = sectionMap[initialSection.toLowerCase()];
            if (targetHref) {
                const matchingLink = links.find(link => link.href === targetHref);
                if (matchingLink && matchingLink.subLinks && matchingLink.subLinks.length > 0) {
                    setActiveSubMenu(matchingLink);
                }
            }
        }
    }, [initialSection, links]);

    // Filter links based on auth
    const filteredLinks = links.filter(link => {
        if (link.requiresAuth && !isAuthenticated) {
            return false;
        }
        return true;
    });

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

    // Handle link click - open submenu or navigate
    const handleLinkClick = (link: NavLink) => {
        if (link.subLinks && link.subLinks.length > 0) {
            setActiveSubMenu(link);
        }
    };

    // Handle closing submenu
    const handleCloseSubMenu = () => {
        setActiveSubMenu(null);
    };

    return (
        <div className={`flex flex-col items-center justify-center w-full px-4 py-8 ${className}`}>
            <div className='flex flex-1 w-full max-w-md'>
                {!activeSubMenu ? (
                    /* Main nav links container */
                    <nav className='flex flex-col items-center justify-between gap-4 w-full'>
                        {filteredLinks.map((link, index) => (
                            <NavLinkCardAnimated
                                key={link.href}
                                href={link.href}
                                title={link.title}
                                subtitle={link.subtitle}
                                icon={link.icon}
                                badge={link.badge}
                                variant='default'
                                onClick={link.subLinks && link.subLinks.length > 0 ? () => handleLinkClick(link) : undefined}
                                style={{
                                    animation: `fade-in 0.6s ease-out ${index * 150}ms both`,
                                }}
                            />
                        ))}
                    </nav>
                ) : (
                    /* Submenu */
                    <div className='flex flex-1 flex-col justify-start gap-4'>
                        {/* Parent link (clickable to close submenu) */}
                        <NavLinkCardAnimated
                            href={activeSubMenu.href}
                            title={activeSubMenu.title}
                            subtitle={activeSubMenu.subtitle}
                            icon={activeSubMenu.icon}
                            badge={activeSubMenu.badge}
                            variant='default'
                            onClick={handleCloseSubMenu}
                            chevronDirection='up'
                            forceActive={true}
                        />

                        {/* Submenu items */}
                        <div className='flex flex-col gap-3'>
                            {activeSubLinks.map((subLink, index) => (
                                <NavLinkCardAnimated
                                    key={subLink.href}
                                    href={subLink.href}
                                    title={subLink.title}
                                    subtitle={subLink.subtitle}
                                    icon={subLink.icon}
                                    badge={subLink.badge}
                                    variant='compact'
                                    style={{
                                        animation: `fade-in 0.6s ease-out ${index * 150}ms both`,
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
