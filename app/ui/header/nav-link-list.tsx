// app/ui/header/nav-link-list.tsx

'use client';

import {
    AcademicCapIcon,
    PuzzlePieceIcon,
    UserGroupIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    NewspaperIcon,
    Squares2X2Icon,
} from '@heroicons/react/24/solid';
import clsx from 'clsx';
import NavLinkCard from '@/app/ui/header/nav-link-card';
import PokerNavButton from '@/app/ui/header/poker-nav-button';
import NotificationsButton from '@/app/ui/header/notifications-button';
import { useUser } from '@/app/lib/providers/user-provider';
import { ReactNode, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';



// Simple poker chip icon
function PokerChipIcon({ className }: { className?: string }) {
    return (
        <svg
            className={className}
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
        >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
            <circle cx="12" cy="12" r="6" fill="currentColor" />
            <circle cx="12" cy="4" r="1.5" fill="currentColor" />
            <circle cx="12" cy="20" r="1.5" fill="currentColor" />
            <circle cx="4" cy="12" r="1.5" fill="currentColor" />
            <circle cx="20" cy="12" r="1.5" fill="currentColor" />
        </svg>
    );
}

export interface NavLink {
  href: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  requiresAuth?: boolean;
  badge?: number | null;
  subLinks?: NavLink[];
}

interface NavLinkListProps {
  className?: string;
  onLinkClick?: (href: string) => void;
  links?: NavLink[];
}

// Default links
const defaultLinks: NavLink[] = [
  {
    href: '/work',
    title: 'Work',
    subtitle: 'My Experience',
    icon: <AcademicCapIcon className="w-12 max-[375px]:w-5" />,
    requiresAuth: false,
  },
  {
    href: '/games',
    title: 'Games',
    subtitle: 'Game Projects',
    icon: <PuzzlePieceIcon className="w-12 max-[375px]:w-5" />,
    requiresAuth: false,
    subLinks: [
      {
        href: '/games/tiles',
        title: 'Tiles',
        subtitle: 'Puzzle Game',
        icon: <Squares2X2Icon className="w-5 h-5" />,
        requiresAuth: false,
      },
      {
        href: '/games/poker',
        title: 'Poker',
        subtitle: "Texas Hold'em",
        icon: <PokerChipIcon className="w-5 h-5" />,
        requiresAuth: false,
      },
    ],
  },
  {
    href: '/feed',
    title: 'Feed',
    subtitle: 'Public Posts',
    icon: <NewspaperIcon className="w-12 max-[375px]:w-5" />,
    requiresAuth: false,
  },
  {
    href: '/users',
    title: 'Users',
    subtitle: 'All Users',
    icon: <UserGroupIcon className="w-12 max-[375px]:w-5" />,
    requiresAuth: false,
  },
];

// Component for expandable nav link with sub-links
function ExpandableNavLink({
  link,
  onLinkClick,
  isAuthenticated
}: {
  link: NavLink;
  onLinkClick?: (href: string) => void;
  isAuthenticated: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const pathname = usePathname();
  const isActive = pathname === link.href;

  // Filter sub-links based on auth
  const visibleSubLinks = link.subLinks?.filter(subLink => {
    if (subLink.requiresAuth) {
      return isAuthenticated;
    }
    return true;
  }) || [];

  const handleToggle = () => {
    if (link.subLinks && link.subLinks.length > 0) {
      setIsExpanded(!isExpanded);
    } else if (onLinkClick) {
      onLinkClick(link.href);
    }
  };

  return (
    <div className="w-full">
      {/* Parent Link */}
      <div
        onClick={handleToggle}
        className={clsx(
          'flex w-full flex-row justify-center items-evenly rounded-lg bg-red-950 text-md text-white font-medium py-1 px-1 cursor-pointer hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:px-3 relative',
          {
            'border-red-500 text-white': isActive,
          }
        )}
      >
        <div className='flex flex-1 w-full flex-row gap-2'>
          <div className='flex flex-1 flex-row items-center justify-center px-1'>
            {link.icon}
          </div>
          <div className='flex flex-4 flex-col justify-center py-2 px-4'>
            <p className="text-lg">{link.title}</p>
            <p className="text-md">{link.subtitle}</p>
          </div>

          {link.subLinks && link.subLinks.length > 0 && (
            <div className="flex items-center justify-center px-2">
              {isExpanded ? (
                <ChevronUpIcon className="w-5 h-5" />
              ) : (
                <ChevronDownIcon className="w-5 h-5" />
              )}
            </div>
          )}
        </div>

        {link.badge !== null && link.badge !== undefined && link.badge > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full">
            {link.badge}
          </span>
        )}
      </div>

      {/* Sub-links */}
      {isExpanded && visibleSubLinks.length > 0 && (
        <div className="mt-1 ml-4 space-y-1">
          {visibleSubLinks.map((subLink) => (
            <Link
              key={subLink.href}
              href={subLink.href}
              onClick={() => onLinkClick?.(subLink.href)}
              className={clsx(
                'flex w-full flex-row justify-center items-evenly rounded-lg bg-red-950 text-md text-white font-medium py-1 px-1 hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:px-2 relative',
                {
                  'border-red-500 text-white': pathname === subLink.href,
                }
              )}
            >
              <div className='flex flex-1 w-full flex-row gap-2'>
                <div className='flex flex-1 flex-row items-center justify-center px-1'>
                  {subLink.icon}
                </div>
                <div className='flex flex-4 flex-col justify-center py-1 px-3'>
                  <p className="text-md font-medium">{subLink.title}</p>
                  {subLink.subtitle && (
                    <p className="text-xs opacity-80">{subLink.subtitle}</p>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function NavLinkList({
  className,
  onLinkClick,
  links = defaultLinks
}: NavLinkListProps) {
  const { status, user } = useUser();

  // Show private links when authenticated or signing out
  const isAuthenticated = user && (status === "authenticated" || status === "signing-out");

  // Filter links based on authentication status
  const visibleLinks = links.filter(link => {
    if (link.requiresAuth) {
      return isAuthenticated;
    }
    return true;
  });

  return (
    <div className={clsx(
      'flex flex-1 flex-col h-full items-center justify-evenly gap-2 p-2 overflow-y-auto',
      className
    )}>
      {visibleLinks.map((link) => {
        // Use expandable component if link has sub-links or no href
        if (link.subLinks && link.subLinks.length > 0) {
          return (
            <ExpandableNavLink
              key={link.href}
              link={link}
              onLinkClick={onLinkClick}
              isAuthenticated={isAuthenticated!!}
            />
          );
        }

        // Use regular NavLinkCard for simple links
        return (
          <NavLinkCard
            key={link.href}
            href={link.href}
            title={link.title}
            subtitle={link.subtitle}
            icon={link.icon}
            badge={link.badge}
            onClick={() => onLinkClick?.(link.href)}
          />
        );
      })}

      {/* <PokerNavButton /> */}
    </div>
  );
}
