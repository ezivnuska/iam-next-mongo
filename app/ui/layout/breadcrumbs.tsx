// app/ui/breadcrumbs.tsx
'use client';

import { clsx } from 'clsx';
import Link from 'next/link';
import { ubuntu } from '@/app/ui/fonts';
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
  const router = useRouter();

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
    <nav aria-label='Breadcrumb' className='block'>
      <ol className={clsx(ubuntu.className, 'flex items-center text-xl md:text-xl')}>
        <li className='mr-2'>
          <Button
            onClick={handleBack}
            className='flex items-center justify-center p-1 transition-colors text-blue-600 dark:text-blue-300 hover:text-blue-300'
            aria-label='Go back'
            variant='ghost'
          >
            <ChevronLeftIcon className='w-6 h-6' strokeWidth={2.5} />
          </Button>
        </li>
        {breadcrumbs.map((breadcrumb, index) => (
          <li
            key={breadcrumb.href}
            aria-current={breadcrumb.active}
            className={breadcrumb.active
              ? 'text-gray-900 dark:text-white'
              : 'text-blue-600 dark:text-blue-300'
            }
          >
            <Link href={breadcrumb.href} className='leading-none'>{breadcrumb.label}</Link>
            {index < breadcrumbs.length - 1 ? (
              <span className='mx-3 inline-block text-gray-400 dark:text-gray-500'>/</span>
            ) : null}
          </li>
        ))}
      </ol>
    </nav>
  );
}
