'use client';

import clsx from 'clsx';
import Link from 'next/link';
import { useHorizontalLayout } from '../hooks/use-horizontal-layout';

interface BrandProps {
    href?: string;
}

export default function Brand({ href = '/' }: BrandProps) {
    const horizontalLayout = useHorizontalLayout();
    return (
        <Link
            href={href}
            className={clsx('flex flex-col justify-center no-underline', {
                'flex-row justify-start': !horizontalLayout,
            })}
            style={{ color: 'inherit' }}
        >
            <span className='text-[30px] leading-none md:text-[32px] lg:text-[40px] font-bold text-gray-900'>
                iam
            </span>
            <span className='text-[30px] leading-none md:text-[32px] lg:text-[40px] font-bold text-gray-900'>
                eric
            </span>
        </Link>
    );
}
