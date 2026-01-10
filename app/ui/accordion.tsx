// app/ui/accordion.tsx

'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { useIsDark } from '@/app/lib/hooks/use-is-dark';
import { getTextColor, getSecondaryTextColor } from '@/app/lib/utils/theme-colors';

interface AccordionItemProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

export function AccordionItem({ title, children, defaultOpen = false }: AccordionItemProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    const isDark = useIsDark();

    return (
        <div className='border-b' style={{ borderColor: isDark ? '#374151' : '#d1d5db' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={clsx(
                    'w-full flex items-center justify-between px-6 py-4 text-left transition-colors',
                    isDark ? 'hover:bg-gray-800/50' : 'hover:bg-gray-100'
                )}
                aria-expanded={isOpen}
            >
                <h3 className='text-xl font-semibold' style={{ color: getTextColor(isDark) }}>
                    {title}
                </h3>
                {isOpen ? (
                    <ChevronUpIcon className='w-6 h-6' style={{ color: getSecondaryTextColor(isDark) }} />
                ) : (
                    <ChevronDownIcon className='w-6 h-6' style={{ color: getSecondaryTextColor(isDark) }} />
                )}
            </button>

            <div
                className={clsx(
                    'overflow-hidden transition-all duration-300 ease-in-out',
                    {
                        'max-h-0 opacity-0': !isOpen,
                        'max-h-[2000px] opacity-100': isOpen,
                    }
                )}
            >
                <div className='px-6 py-6 space-y-6' style={{ color: getSecondaryTextColor(isDark) }}>
                    {children}
                </div>
            </div>
        </div>
    );
}

interface AccordionProps {
    children: React.ReactNode;
    className?: string;
}

export function Accordion({ children, className }: AccordionProps) {
    const isDark = useIsDark();

    return (
        <div
            className={clsx('rounded-lg overflow-hidden', className)}
            style={{ backgroundColor: isDark ? '#111827' : '#f9fafb' }}
        >
            {children}
        </div>
    );
}
