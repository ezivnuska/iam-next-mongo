// app/ui/layout/page-header.tsx

import { ubuntu } from '@/app/ui/fonts';
import { clsx } from 'clsx';

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
    return (
        <header className={clsx('mb-4', className)}>
            <h1
                className={clsx(
                    ubuntu.className,
                    'leading-none text-xl font-bold text-gray-900 md:text-xl'
                )}
            >
                {title}
            </h1>
            {subtitle && (
                <p
                    className={clsx(
                        ubuntu.className,
                        'mt-0.5 text-lg text-gray-500 md:text-lg'
                    )}
                >
                    {subtitle}
                </p>
            )}
        </header>
    );
}
