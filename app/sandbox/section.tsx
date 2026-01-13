// app/sandbox/section.tsx

import { ReactNode } from 'react';
import { clsx } from 'clsx';

interface SectionProps {
    children: ReactNode;
    title: string;
    className?: string;
}

export function Section({ children, title, className = '' }: SectionProps) {
    return (
        <div className={clsx('flex flex-1 flex-col', {
            
            },
            className
        )}>
            {title && <span className='text-2xl font-medium text-black dark:text-white px-2 my-2'>{title}</span>}
            {children}
        </div>
    );
}
