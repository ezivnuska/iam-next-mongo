'use client';

import { clsx } from 'clsx';

interface PageHeaderProps {
    title?: string;
    subtitle?: string;
    className?: string;
    actions?: React.ReactNode;
}

export default function PageHeader({ title, subtitle, className, actions }: PageHeaderProps) {
    return (
        <header className={clsx('flex items-center justify-between bg-gray-900 border-b border-gray-700 py-2 px-4', className)}>
            <div>
                {title && (
                    <h1 className='leading-none text-xl font-bold text-white'>
                        {title}
                    </h1>
                )}
                {subtitle && (
                    <p className='mt-0.5 text-lg font-semibold text-white'>
                        {subtitle}
                    </p>
                )}
            </div>
            {actions && <div className='shrink-0'>{actions}</div>}
        </header>
    );
}
