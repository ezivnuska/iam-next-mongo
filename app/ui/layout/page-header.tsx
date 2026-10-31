// app/ui/layout/page-header.tsx

'use client';

import { clsx } from 'clsx';
import Breadcrumbs from '@/app/ui/layout/breadcrumbs';

interface Breadcrumb {
    label: string;
    href: string;
    active?: boolean;
}

interface PageHeaderProps {
    title?: string;
    subtitle?: string;
    className?: string;
    breadcrumbs?: Breadcrumb[];
    useBreadcrumbs?: boolean;
}

export default function PageHeader({
    title,
    subtitle,
    className,
    breadcrumbs,
    useBreadcrumbs = false
}: PageHeaderProps) {
    return (
        <header className={clsx('', className)}>
            {useBreadcrumbs && breadcrumbs ? (
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            ) : title ? (
                <h1 className='leading-none text-xl font-bold md:text-xl text-gray-900 dark:text-white'>
                    {title}
                </h1>
            ) : null}

            {subtitle && (
                <p className='mt-0.5 text-lg md:text-lg px-2 text-gray-600 dark:text-gray-300'>
                    {subtitle}
                </p>
            )}
        </header>
    );
}
