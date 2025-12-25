// app/ui/header/nav-link-card-animated.tsx

'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState } from 'react';
import clsx from 'clsx';
import { useTheme } from '@/app/lib/hooks/use-theme';

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
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';
  const isActive = forceActive || pathname === href || pathname.startsWith(href + '/');
  const isDefault = variant === 'default';
  const isCompact = variant === 'compact';
  const [isHovered, setIsHovered] = useState(false);

  // Variant-specific classes (structure only, colors via inline styles)
  const containerClasses = clsx(
    'flex items-center gap-4 transition-all duration-200 group relative',
    {
      // Default variant
      'p-6 rounded-2xl': isDefault && isActive,
      'p-6 rounded-2xl border-2': isDefault && !isActive,
      // Compact variant (same structure for active and inactive)
      'p-4 rounded-lg border': isCompact,
    }
  );

  // Container inline styles with hover
  const containerStyle = {
    ...(isDefault && isActive ? {} : {}),
    ...(isDefault && !isActive
      ? {
          borderColor: isHovered ? '#3b82f6' : isDark ? '#374151' : '#d1d5db',
          backgroundColor: isHovered
            ? isDark
              ? '#374151'
              : '#e5e7eb'
            : isDark
            ? '#1f2937'
            : '#f3f4f6',
        }
      : {}),
    ...(isCompact && isActive
      ? {
          borderColor: isDark ? '#93c5fd' : '#60a5fa',
          backgroundColor: 'transparent',
        }
      : {}),
    ...(isCompact && !isActive
      ? {
          borderColor: isHovered ? (isDark ? '#60a5fa' : '#3b82f6') : isDark ? '#374151' : '#d1d5db',
          backgroundColor: isHovered
            ? isDark
              ? '#1f2937'
              : '#f3f4f6'
            : isDark
            ? '#111827'
            : '#f9fafb',
        }
      : {}),
  };

  const iconClasses = clsx('shrink-0 transition-colors', {
    '[&>*]:w-10 [&>*]:h-10': isDefault,
    '[&>*]:w-6 [&>*]:h-6': isCompact,
  });

  const iconStyle = {
    color: isActive
      ? isDark
        ? '#60a5fa'
        : '#3b82f6'
      : isHovered
      ? '#3b82f6'
      : isDark
      ? '#9ca3af'
      : '#4b5563',
  };

  const titleClasses = clsx('font-bold transition-colors', {
    'text-xl': isDefault,
    'text-lg': isCompact,
  });

  const titleStyle = {
    color: isActive
      ? isDark
        ? '#60a5fa'
        : '#2563eb'
      : isHovered
      ? isDark
        ? '#60a5fa'
        : '#2563eb'
      : isDark
      ? '#ffffff'
      : '#111827',
  };

  const subtitleClasses = clsx('transition-colors', {
    'mt-1': isDefault,
    'mt-0.5 text-xs': isCompact,
  });

  const subtitleStyle = {
    color: isActive ? (isDark ? '#93c5fd' : '#3b82f6') : isDark ? '#9ca3af' : '#4b5563',
  };

  const arrowStyle = {
    color: isActive
      ? isDark
        ? '#60a5fa'
        : '#3b82f6'
      : isHovered
      ? '#3b82f6'
      : isDark
      ? '#4b5563'
      : '#9ca3af',
  };

  const content = (
    <>
      {/* Icon */}
      <div className={iconClasses} style={iconStyle}>
        {icon}
      </div>

      {/* Text content */}
      <div className='flex-1'>
        <h2 className={titleClasses} style={titleStyle}>
          {title}
        </h2>
        <p className={subtitleClasses} style={subtitleStyle}>
          {subtitle}
        </p>
      </div>

      {/* Arrow icon */}
      <div className='shrink-0 transition-colors' style={arrowStyle}>
        <svg
          className={clsx('fill-none stroke-current', {
            'w-6 h-6': isDefault,
            'w-5 h-5': isCompact,
          })}
          viewBox='0 0 24 24'
        >
          <path
            strokeLinecap='round'
            strokeLinejoin='round'
            strokeWidth={2}
            d={chevronDirection === 'up' ? 'M19 15l-7-7-7 7' : 'M9 5l7 7-7 7'}
          />
        </svg>
      </div>

      {/* Badge */}
      {badge !== null && badge !== undefined && badge > 0 && (
        <span
          className={clsx(
            'absolute flex items-center justify-center min-w-[24px] h-[24px] px-2 font-bold text-white bg-red-500 rounded-full',
            {
              '-top-2 -right-2 text-sm': isDefault,
              '-top-1 -right-1 text-xs min-w-[20px] h-[20px]': isCompact,
            }
          )}
        >
          {badge}
        </span>
      )}
    </>
  );

  // If onClick is provided, render as button
  if (onClick) {
    return (
      <button
        onClick={onClick}
        onMouseEnter={() => !isActive && setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={clsx(containerClasses, 'w-full text-left')}
        style={{ ...containerStyle, ...style }}
      >
        {content}
      </button>
    );
  }

  // Otherwise render as Link
  return (
    <Link
      href={href}
      className='w-full'
      style={style}
      onMouseEnter={() => !isActive && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={containerClasses} style={containerStyle}>
        {content}
      </div>
    </Link>
  );
}
