// app/ui/layout/page-header.tsx

'use client';

import { clsx } from 'clsx';
import { useTheme } from '@/app/lib/hooks/use-theme';
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

/**
 * Page Header Component
 *
 * Displays a page title with optional subtitle OR breadcrumbs navigation.
 *
 * @param title - The main page heading (not shown if useBreadcrumbs is true)
 * @param subtitle - Optional subtitle or description text
 * @param className - Optional additional CSS classes
 * @param breadcrumbs - Array of breadcrumb items { label, href, active? }
 * @param useBreadcrumbs - If true, shows breadcrumbs instead of title
 *
 */

export default function PageHeader({
    title,
    subtitle,
    className,
    breadcrumbs,
    useBreadcrumbs = false
}: PageHeaderProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    return (
        <header className={clsx('px-2', className)}>
            {useBreadcrumbs && breadcrumbs ? (
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            ) : title ? (
                <h1
                    className='leading-none text-xl font-bold md:text-xl'
                    style={{ color: isDark ? '#ffffff' : '#111827' }}
                >
                    {title}
                </h1>
            ) : null}

            {subtitle && (
                <p
                    className='mt-0.5 text-lg md:text-lg'
                    style={{ color: isDark ? '#d1d5db' : '#4b5563' }}
                >
                    {subtitle}
                </p>
            )}
        </header>
    );
}
