'use client';

import { clsx } from 'clsx';

interface PageHeaderProps {
    title?: string;
    subtitle?: string;
    className?: string;
}

export default function PageHeader({ title, subtitle, className }: PageHeaderProps) {
    return (
        <header className={clsx('border-b py-3', className)}>
            {title && (
                <h1 className='leading-none text-xl font-bold md:text-xl text-gray-900'>
                    {title}
                </h1>
            )}
            {subtitle && (
                <p className='mt-0.5 text-lg md:text-lg px-2 text-gray-600'>
                    {subtitle}
                </p>
            )}
        </header>
    );
}
