// app/ui/header/nav-link-list.tsx

'use client';

import {
    AcademicCapIcon,
    PuzzlePieceIcon,
    UserGroupIcon,
} from '@heroicons/react/24/solid';
import clsx from 'clsx';
import NavLinkCard from '@/app/ui/header/nav-link-card';
import PokerNavButton from '@/app/ui/header/poker-nav-button';
import NotificationsButton from '@/app/ui/header/notifications-button';
import { useUser } from '@/app/lib/providers/user-provider';

interface NavLinkListProps {
  className?: string;
  onLinkClick?: () => void;
}

export default function NavLinkList({
  className,
  onLinkClick
}: NavLinkListProps) {
  const { status, user } = useUser();

  // Show private links when authenticated or signing out
  const showPrivateLinks = user && (status === "authenticated" || status === "signing-out");

  return (
    <div className={clsx(
      'flex flex-1 flex-col h-full items-center justify-evenly gap-1 p-1 border-2 border-dashed border-red-500',
      className
    )}>
      <NavLinkCard
        href='/work'
        title='Work'
        subtitle='My Experience'
        icon={<AcademicCapIcon className="w-12 max-[375px]:w-5" />}
        onClick={onLinkClick}
      />

      <NavLinkCard
        href='/games'
        title='Games'
        subtitle='Game Projects'
        icon={<PuzzlePieceIcon className="w-12 max-[375px]:w-5" />}
        onClick={onLinkClick}
      />

      {/* Private links - only for authenticated users */}
      {showPrivateLinks && (
        <>
          <NavLinkCard
            href='/users'
            title='Users'
            subtitle='Community'
            icon={<UserGroupIcon className="w-12 max-[375px]:w-5" />}
            onClick={onLinkClick}
          />

          {/* <NotificationsButton /> */}
        </>
      )}

      {/* <PokerNavButton /> */}
    </div>
  );
}
