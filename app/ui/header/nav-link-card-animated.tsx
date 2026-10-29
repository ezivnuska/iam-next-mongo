// app/ui/header/nav-link-card-animated.tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';
import clsx from 'clsx';

interface NavLinkCardAnimatedProps {
  href: string;
  title: string;
  subtitle: string;
  icon: ReactNode;
  badge?: number | null;
  variant?: 'default' | 'compact';
  onClick?: () => void;
  style?: React.CSSProperties;
  chevronDirection?: 'right' | 'up';
  forceActive?: boolean;
}

export default function NavLinkCardAnimated({
  href,
  title,
  subtitle,
  icon,
  badge,
  variant = 'default',
  onClick,
  style,
  chevronDirection = 'right',
  forceActive = false,
}: NavLinkCardAnimatedProps) {
  const pathname = usePathname();
  const isActive = forceActive || pathname === href || pathname.startsWith(href + '/');
  const isDefault = variant === 'default';
  const isCompact = variant === 'compact';

  const containerClasses = clsx(
    'group flex items-center gap-4 transition-all duration-200 relative',
    {
      // Default active
      'p-6 rounded-2xl': isDefault && isActive,
      // Default inactive
      'p-6 rounded-2xl border-2 border-gray-300 dark:border-gray-700 hover:border-blue-500 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700': isDefault && !isActive,
      // Compact active
      'p-4 rounded-lg border border-blue-400 dark:border-blue-300': isCompact && isActive,
      // Compact inactive
      'p-4 rounded-lg border border-gray-300 dark:border-gray-700 hover:border-blue-500 bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800': isCompact && !isActive,
    }
  );

  const iconClasses = clsx('shrink-0 transition-colors', {
    '[&>*]:w-10 [&>*]:h-10': isDefault,
    '[&>*]:w-6 [&>*]:h-6': isCompact,
    'text-blue-500 dark:text-blue-400': isActive,
    'text-gray-600 dark:text-gray-400 group-hover:text-blue-500': !isActive,
  });

  const titleClasses = clsx('font-bold transition-colors', {
    'text-xl': isDefault,
    'text-lg': isCompact,
    'text-blue-600 dark:text-blue-400': isActive,
    'text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400': !isActive,
  });

  const subtitleClasses = clsx('transition-colors', {
    'mt-1': isDefault,
    'mt-0.5 text-xs': isCompact,
    'text-blue-500 dark:text-blue-300': isActive,
    'text-gray-600 dark:text-gray-400': !isActive,
  });

  const arrowClasses = clsx('shrink-0 transition-colors', {
    'w-6 h-6': isDefault,
    'w-5 h-5': isCompact,
    'text-blue-500 dark:text-blue-400': isActive,
    'text-gray-400 dark:text-gray-600 group-hover:text-blue-500': !isActive,
  });

  const content = (
    <>
      <div className={iconClasses}>{icon}</div>

      <div className='flex-1'>
        <h2 className={titleClasses}>{title}</h2>
        <p className={subtitleClasses}>{subtitle}</p>
      </div>

      <svg
        className={clsx(arrowClasses, 'fill-none stroke-current')}
        viewBox='0 0 24 24'
      >
        <path
          strokeLinecap='round'
          strokeLinejoin='round'
          strokeWidth={2}
          d={chevronDirection === 'up' ? 'M19 15l-7-7-7 7' : 'M9 5l7 7-7 7'}
        />
      </svg>

      {badge !== null && badge !== undefined && badge > 0 && (
        <span className={clsx(
          'absolute flex items-center justify-center min-w-[24px] h-[24px] px-2 font-bold text-white bg-red-500 rounded-full',
          {
            '-top-2 -right-2 text-sm': isDefault,
            '-top-1 -right-1 text-xs min-w-[20px] h-[20px]': isCompact,
          }
        )}>
          {badge}
        </span>
      )}
    </>
  );

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={clsx(containerClasses, 'w-full text-left')}
        style={style}
      >
        {content}
      </button>
    );
  }

  return (
    <Link href={href} className='w-full' style={style}>
      <div className={containerClasses}>{content}</div>
    </Link>
  );
}
