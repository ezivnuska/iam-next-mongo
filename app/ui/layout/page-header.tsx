// app/ui/layout/page-header.tsx

'use client';

import { clsx } from 'clsx';
import { useIsDark } from '@/app/lib/hooks/use-is-dark';
import { getTextColor, getTertiaryTextColor } from '@/app/lib/utils/theme-colors';
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
    const isDark = useIsDark();

    return (
        <header className={clsx('', className)}>
            {useBreadcrumbs && breadcrumbs ? (
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            ) : title ? (
                <h1
                    className='leading-none text-xl font-bold md:text-xl'
                    style={{ color: getTextColor(isDark) }}
                >
                    {title}
                </h1>
            ) : null}

            {subtitle && (
                <p
                    className='mt-0.5 text-lg md:text-lg'
                    style={{ color: getTertiaryTextColor(isDark) }}
                >
                    {subtitle}
                </p>
            )}
        </header>
    );
}
