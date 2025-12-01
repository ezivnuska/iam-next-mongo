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
 * @example
 * ```tsx
 * <PageHeader
 *   title="Users"
 *   subtitle="Browse and manage user profiles"
 * />
 * ```
 */
export default function PageHeader({ title, subtitle, className }: PageHeaderProps) {
  return (
    <header className={clsx('mb-6', className)}>
      <h1
        className={clsx(
          ubuntu.className,
          'text-2xl font-bold text-gray-900 md:text-3xl'
        )}
      >
        {title}
      </h1>
      {subtitle && (
        <p
          className={clsx(
            ubuntu.className,
            'mt-1 text-xl text-gray-500 md:text-2xl'
          )}
        >
          {subtitle}
        </p>
      )}
    </header>
  );
}
