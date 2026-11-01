'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useHorizontalLayout } from '../hooks/use-horizontal-layout';

export default function Brand() {
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
                iam
            </span>
            <span className='text-[30px] leading-none md:text-[32px] lg:text-[40px] font-bold text-gray-900 dark:text-white'>
                eric
            </span>
        </Link>
    );
}
