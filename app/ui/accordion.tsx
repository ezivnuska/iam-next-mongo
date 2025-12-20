// app/ui/accordion.tsx

'use client';

import { useState } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

interface AccordionItemProps {
    title: string;
    children: React.ReactNode;
    defaultOpen?: boolean;
}

export function AccordionItem({ title, children, defaultOpen = false }: AccordionItemProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className='border-b border-gray-700'>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className='w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-800/50 transition-colors'
                aria-expanded={isOpen}
            >
                <h3 className='text-xl font-semibold text-white'>{title}</h3>
                {isOpen ? (
                    <ChevronUpIcon className='w-6 h-6 text-gray-400' />
                ) : (
                    <ChevronDownIcon className='w-6 h-6 text-gray-400' />
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
                <div className='px-6 py-6 space-y-6'>
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
    return (
        <div className={clsx('bg-gray-900 rounded-lg overflow-hidden', className)}>
            {children}
        </div>
    );
}
