// app/ui/layout/page-header.tsx

'use client';

import { clsx } from 'clsx';
import { useTheme } from '@/app/lib/hooks/use-theme';

interface PageHeaderProps {
    title: string;
    subtitle?: string;
    className?: string;
}

/**
 * Page Header Component
 *
 * Displays a page title with optional subtitle using the same text styles as breadcrumbs.
 *
 * @param title - The main page heading
 * @param subtitle - Optional subtitle or description text
 * @param className - Optional additional CSS classes
 *
 */

export default function PageHeader({ title, subtitle, className }: PageHeaderProps) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    return (
        <header className={clsx('px-2', className)}>
            <h1
                className='leading-none text-xl font-bold md:text-xl'
                style={{ color: isDark ? '#ffffff' : '#111827' }}
            >
                {title}
            </h1>
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
