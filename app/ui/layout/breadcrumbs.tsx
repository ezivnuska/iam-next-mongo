// app/ui/breadcrumbs.tsx
'use client';

import { clsx } from 'clsx';
import Link from 'next/link';
import { ubuntu } from '@/app/ui/fonts';
import { useHorizontalLayout } from '@/app/lib/hooks/use-horizontal-layout';
import { useIsDark } from '@/app/lib/hooks/use-is-dark';
import { ChevronLeftIcon } from '@/app/ui/icons';
import { useRouter } from 'next/navigation';
import { Button } from '../button';

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
  const router = useRouter();

  // Find the previous breadcrumb (the one before the active one)
  const activeIndex = breadcrumbs.findIndex(b => b.active);
  const previousBreadcrumb = activeIndex > 0 ? breadcrumbs[activeIndex - 1] : null;

  const handleBack = () => {
    if (previousBreadcrumb) {
      router.push(previousBreadcrumb.href);
    } else {
      router.back();
    }
  };

  return (
    <nav aria-label='Breadcrumb' className={clsx('block', {
        // 'py-4': horizontalLayout,
    })}>
      <ol className={clsx(ubuntu.className, 'flex items-center text-xl md:text-xl')}>
        <li className='mr-2'>
          <Button
            onClick={handleBack}
            className='flex items-center justify-center p-1 hover:text-blue-300 transition-colors'
            aria-label='Go back'
            style={{ color: isDark ? '#93c5fd' : '#2563eb' }}
            variant='ghost'
          >
            <ChevronLeftIcon className='w-6 h-6' strokeWidth={2.5} />
          </Button>
        </li>
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
