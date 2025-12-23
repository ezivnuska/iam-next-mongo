// app/ui/breadcrumbs.tsx
'use client';

import { clsx } from 'clsx';
import Link from 'next/link';
import { ubuntu } from '@/app/ui/fonts';
import { useHorizontalLayout } from '@/app/lib/hooks/use-horizontal-layout';

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
  return (
    <nav aria-label='Breadcrumb' className={clsx('block text-white', {
        // 'py-4': horizontalLayout,
    })}>
      <ol className={clsx(ubuntu.className, 'flex text-xl md:text-xl')}>
        {breadcrumbs.map((breadcrumb, index) => (
          <li
            key={breadcrumb.href}
            aria-current={breadcrumb.active}
            className={clsx(
              breadcrumb.active ? 'text-white' : 'text-blue-300',
            )}
          >
            <Link href={breadcrumb.href} className='leading-none'>{breadcrumb.label}</Link>
            {index < breadcrumbs.length - 1 ? (
              <span className='mx-3 inline-block text-gray-500'>/</span>
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
