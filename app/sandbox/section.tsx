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
        <div className={clsx('flex flex-col w-full min-h-[500px] border border-yellow-300', {
            
            },
            className
        )}>
            {title && <span className='text-2xl font-medium text-black dark:text-white px-2 my-2'>{title}</span>}
            <div className='flex flex-1 w-full'>
                {children}
            </div>
        </div>
    );
}
