// app/ui/header/nav-link-list.tsx

'use client';

import {
    AcademicCapIcon,
    PuzzlePieceIcon,
    UserGroupIcon,
    NewspaperIcon,
    Squares2X2Icon,
} from '@heroicons/react/24/solid';
import clsx from 'clsx';
import NavButtonSquare from '@/app/ui/header/nav-button-square';
import { useUser } from '@/app/lib/providers/user-provider';
import { ReactNode } from 'react';



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
    icon: <AcademicCapIcon className="w-10 h-10" />,
    requiresAuth: false,
  },
  {
    href: '/games',
    title: 'Games',
    subtitle: 'Game Projects',
    icon: <PuzzlePieceIcon className="w-10 h-10" />,
    requiresAuth: false,
    subLinks: [
      {
        href: '/games/tiles',
        title: 'Tiles',
        subtitle: 'Puzzle Game',
        icon: <Squares2X2Icon className="w-10 h-10" />,
        requiresAuth: false,
      },
      {
        href: '/games/poker',
        title: 'Poker',
        subtitle: "Texas Hold'em",
        icon: <PokerChipIcon className="w-10 h-10" />,
        requiresAuth: false,
      },
    ],
  },
  {
    href: '/feed',
    title: 'Feed',
    subtitle: 'Public Posts',
    icon: <NewspaperIcon className="w-10 h-10" />,
    requiresAuth: false,
  },
  {
    href: '/users',
    title: 'Users',
    subtitle: 'All Users',
    icon: <UserGroupIcon className="w-10 h-10" />,
    requiresAuth: false,
  },
];


export default function NavLinkList({
  className,
  onLinkClick,
  links = defaultLinks
}: NavLinkListProps) {
  const { status, user } = useUser();

  // Show private links when authenticated or signing out
  const isAuthenticated = user && (status === "authenticated" || status === "signing-out");

  // Flatten all links including sublinks into a single array
  const allLinks: NavLink[] = [];

  links.forEach(link => {
    // Filter main link by auth
    if (link.requiresAuth && !isAuthenticated) {
      return;
    }

    // Add main link
    allLinks.push(link);

    // Add sublinks if they exist
    if (link.subLinks) {
      link.subLinks.forEach(subLink => {
        if (subLink.requiresAuth && !isAuthenticated) {
          return;
        }
        allLinks.push(subLink);
      });
    }
  });

  return (
    <div className={clsx(
      'flex flex-row items-center justify-center flex-wrap w-full max-w-4/5 self-center',
      className
    )}>
      {/* <div className="flex flex-row flex-wrap items-center justify-evenly w-full h-full auto-rows-fr border" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}> */}
        {allLinks.map((link) => (
          <NavButtonSquare
            key={link.href}
            href={link.href}
            title={link.title}
            icon={link.icon}
            badge={link.badge}
            onClick={() => onLinkClick?.(link.href)}
          />
        ))}
      {/* </div> */}
    </div>
  );
}
