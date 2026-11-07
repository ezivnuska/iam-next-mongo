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
        <header className={clsx('flex items-center justify-between border-b py-3', className)}>
            <div>
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
            </div>
            {actions && <div className='shrink-0'>{actions}</div>}
        </header>
    );
}
