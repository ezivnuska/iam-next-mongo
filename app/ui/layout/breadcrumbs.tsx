// app/ui/breadcrumbs.tsx
'use client';

import { clsx } from 'clsx';
import Link from 'next/link';
import { ubuntu } from '@/app/ui/fonts';
import { useHorizontalLayout } from '@/app/lib/hooks/use-horizontal-layout';
import { useIsDark } from '@/app/lib/hooks/use-is-dark';

interface Breadcrumb {
  label: string;
  href: string;
  active?: boolean;
}

export default function Breadcrumbs({
  breadcrumbs,
}: {
  breadcrumbs: Breadcrumb[];
}) {
  const horizontalLayout = useHorizontalLayout();
  const isDark = useIsDark();

  return (
    <nav aria-label='Breadcrumb' className={clsx('block', {
        // 'py-4': horizontalLayout,
    })}>
      <ol className={clsx(ubuntu.className, 'flex text-xl md:text-xl')}>
        {breadcrumbs.map((breadcrumb, index) => (
          <li
            key={breadcrumb.href}
            aria-current={breadcrumb.active}
            style={{
              color: breadcrumb.active
                ? (isDark ? '#ffffff' : '#000000')
                : (isDark ? '#93c5fd' : '#2563eb')
            }}
          >
            <Link href={breadcrumb.href} className='leading-none'>{breadcrumb.label}</Link>
            {index < breadcrumbs.length - 1 ? (
              <span className='mx-3 inline-block' style={{ color: isDark ? '#6b7280' : '#9ca3af' }}>/</span>
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
