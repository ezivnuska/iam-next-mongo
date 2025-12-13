// app/ui/header/nav-link-list.tsx

'use client';

import {
    AcademicCapIcon,
    PuzzlePieceIcon,
} from '@heroicons/react/24/solid';
import clsx from 'clsx';
import NavLinkCard from '@/app/ui/header/nav-link-card';
import PokerNavButton from '@/app/ui/header/poker-nav-button';

interface NavLinkListProps {
  className?: string;
}

export default function NavLinkList({
  className
}: NavLinkListProps) {
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
      />

      <NavLinkCard
        href='/games'
        title='Games'
        subtitle='Game Projects'
        icon={<PuzzlePieceIcon className="w-12 max-[375px]:w-5" />}
      />

      {/* <PokerNavButton /> */}
    </div>
  );
}
