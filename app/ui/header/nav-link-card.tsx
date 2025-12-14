// app/ui/header/nav-link-card.tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { ReactNode } from 'react';

interface NavLinkCardProps {
  href: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  badge?: number | null;
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  onClick?: (href: string) => void;
}

export default function NavLinkCard({
  href,
  title,
  subtitle,
  icon,
  badge,
  className,
  iconClassName,
  textClassName,
  onClick
}: NavLinkCardProps) {
  const pathname = usePathname();

  const isActive = pathname === href;

  const handleClick = () => {
    if (onClick) {
      onClick(href);
    }
  };

  return (
    <Link
      href={href}
      prefetch={true}
      onClick={handleClick}
      className={clsx(
        'flex w-full flex-row justify-center items-evenly rounded-lg border bg-red-940 text-md text-white font-medium py-1 px-1 hover:bg-sky-100 hover:text-blue-600 md:flex-none md:justify-start md:px-3 relative',
        {
          'border-red-500 text-white': isActive,
        },
        className
      )}
    >
      <div className='flex flex-1 w-full flex-row gap-2'>
        <div className={clsx(
          'flex flex-1 flex-row items-center justify-center',
          iconClassName
        )}>
          {icon}
        </div>
        <div className={clsx(
          'flex flex-4 flex-col justify-center py-2 px-4',
          textClassName
        )}>
          <p className="text-lg">{title}</p>
          <p className="text-md">{subtitle}</p>
        </div>
      </div>

      {/* Badge (for player count, notifications, etc.) */}
      {badge !== null && badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-bold text-white bg-red-500 rounded-full">
          {badge}
        </span>
      )}
    </Link>
  );
}
