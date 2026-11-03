'use client';

import Link from 'next/link';
import clsx from 'clsx';
import { useBreadcrumbs } from '../hooks/use-breadcrumbs';
import { useHorizontalLayout } from '../hooks/use-horizontal-layout';

export default function BreadcrumbNav() {
    const crumbs = useBreadcrumbs();
    const horizontalLayout = useHorizontalLayout();

    const parents = crumbs.filter(c => !c.active);
    if (parents.length === 0) return null;

    return (
        <nav
            aria-label='Breadcrumb'
            className={clsx('flex items-center gap-1 text-sm', {
                'flex-row px-4 pb-2': !horizontalLayout,
                'flex-col items-start px-4 py-2 gap-0.5': horizontalLayout,
            })}
        >
            {!horizontalLayout && parents.map((crumb, i) => (
                <span key={crumb.href} className='flex items-center gap-1'>
                    {i > 0 && <span className='text-gray-400 select-none'>/</span>}
                    <Link
                        href={crumb.href}
                        className={clsx('hover:underline', {
                            'text-gray-700 font-medium': crumb.active,
                            'text-blue-600': !crumb.active,
                        })}
                    >
                        {crumb.label}
                    </Link>
                </span>
            ))}

            {horizontalLayout && parents.map((crumb) => (
                <Link
                    key={crumb.href}
                    href={crumb.href}
                    className={clsx('text-xs hover:underline', {
                        'text-gray-700 font-medium': crumb.active,
                        'text-blue-600': !crumb.active,
                    })}
                >
                    {crumb.label}
                </Link>
            ))}
        </nav>
    );
}
