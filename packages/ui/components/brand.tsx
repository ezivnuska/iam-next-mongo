'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useHorizontalLayout } from '../hooks/use-horizontal-layout';

interface BrandProps {
    lines?: [string, string];
}

export default function Brand({ lines = ['iam', 'eric'] }: BrandProps) {
    const horizontalLayout = useHorizontalLayout();
    return (
        <Link
            href='/'
            className={clsx('flex flex-col justify-center no-underline', {
                'flex-row justify-start': !horizontalLayout,
            })}
            style={{ color: 'inherit' }}
        >
            <span className='text-[30px] leading-none md:text-[32px] lg:text-[40px] font-bold text-gray-900 dark:text-white'>
                {lines[0]}
            </span>
            <span className='text-[30px] leading-none md:text-[32px] lg:text-[40px] font-bold text-gray-900 dark:text-white'>
                {lines[1]}
            </span>
        </Link>
    );
}
